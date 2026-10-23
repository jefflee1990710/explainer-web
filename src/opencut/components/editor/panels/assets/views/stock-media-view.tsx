"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/opencut/commands";
import type { EditorCore } from "@/opencut/core";
import { useEditor } from "@/opencut/editor/use-editor";
import {
	createStreamingVideoAsset,
	fetchMediaBlobWithTimeout,
} from "@/opencut/embed/scro-media-load";
import { armScroSync, rememberClipSource } from "@/opencut/embed/scro-media-sources";
import {
	useScroSubtitleCatalog,
	useScroSubtitleVideoId,
} from "@/opencut/embed/scro-subtitle-store";
import { matchSubtitleSlots } from "@/opencut/embed/scro-subtitle-slots";
import { processMediaAssets } from "@/opencut/media/processing";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";
import { Button } from "@/opencut/components/ui/button";
import { Input } from "@/opencut/components/ui/input";
import { ScrollArea } from "@/opencut/components/ui/scroll-area";
import {
	autoPlanOpencutBrollAction,
	searchOpencutStockMediaAction,
} from "@/presentation/actions/opencut-stock-media";
import type { FreeStockMediaItem } from "@/service/opencut/stock-media";
import { cn } from "@/opencut/utils/ui";

const QUICK_TOPICS = [
	{ label: "商業圖表 Chart", query: "business chart finance" },
	{ label: "科技 AI Tech", query: "technology computer data" },
	{ label: "辦公室 Office", query: "modern office workspace" },
	{ label: "城市街景 City", query: "hong kong city street" },
	{ label: "社群手機 Social", query: "smartphone social media" },
	{ label: "大自然 Nature", query: "nature landscape aerial" },
];

export function isScroBrollElementName(name: string): boolean {
	return /^B-Roll\b/i.test(name.trim());
}

/**
 * Downloads/registers a FreeStockMediaItem in OpenCut's MediaManager and inserts it onto an
 * overlay video track above the main talking-head track.
 */
export async function insertStockMediaOnOverlayTrack({
	editor,
	videoId,
	item,
	startTimeSeconds,
	durationSeconds,
	elementName,
	explicitTrackId,
}: {
	editor: EditorCore;
	videoId?: string | null;
	item: FreeStockMediaItem;
	startTimeSeconds: number;
	durationSeconds: number;
	elementName?: string;
	explicitTrackId?: string;
}): Promise<boolean> {
	const project = editor.project.getActiveOrNull();
	if (!project) return false;

	let createdAsset = null;
	if (item.type === "video") {
		const asset = await createStreamingVideoAsset({
			url: item.sourceUrl,
			name: item.title,
			posterUrl: item.thumbUrl,
			fallbackDuration: item.duration ?? durationSeconds,
			fallbackWidth: item.width,
			fallbackHeight: item.height,
		});
		createdAsset = await editor.media.addMediaAsset({
			projectId: project.metadata.id,
			asset: {
				...asset,
				sourceUrl: item.sourceUrl,
			},
		});
	} else {
		const blob = await fetchMediaBlobWithTimeout({ url: item.sourceUrl });
		if (!blob) return false;
		const mime = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
		const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
		const file = new File([blob], `${item.title.slice(0, 40)}.${ext}`, { type: mime });
		const processed = await processMediaAssets({ files: [file] });
		const first = processed[0];
		if (!first) return false;
		createdAsset = await editor.media.addMediaAsset({
			projectId: project.metadata.id,
			asset: {
				...first,
				sourceUrl: item.sourceUrl,
			},
		});
	}

	if (!createdAsset) return false;
	if (videoId) {
		rememberClipSource(videoId, createdAsset.id, item.sourceUrl);
	}

	const scene = editor.scenes.getActiveScene();
	let trackId = explicitTrackId;
	let addTrackCmd: AddTrackCommand | null = null;

	if (!trackId) {
		const existingOverlayVideoTrack = scene.tracks.overlay.find(
			(track) => track.type === "video",
		);
		if (existingOverlayVideoTrack) {
			trackId = existingOverlayVideoTrack.id;
		} else {
			// Place the B-roll overlay video track right above main track (at the bottom of overlay tracks so text tracks stay on top)
			addTrackCmd = new AddTrackCommand({
				type: "video",
				index: scene.tracks.overlay.length,
			});
			trackId = addTrackCmd.getTrackId();
		}
	}

	const element = buildElementFromMedia({
		mediaId: createdAsset.id,
		mediaType: createdAsset.type,
		name: elementName ?? `B-Roll · ${item.title.slice(0, 28)}`,
		startTime: mediaTimeFromSeconds({ seconds: Math.max(0, startTimeSeconds) }),
		duration: mediaTimeFromSeconds({ seconds: Math.max(0.8, durationSeconds) }),
	});

	const insertCmd = new InsertElementCommand({
		placement: { mode: "explicit", trackId },
		element,
	});

	editor.command.execute({
		command: addTrackCmd ? new BatchCommand([addTrackCmd, insertCmd]) : insertCmd,
	});
	armScroSync();
	return true;
}

/**
 * Shared auto-insert B-roll cutaway runner: reads the storyboard VO lines and main-track clip
 * timings, asks AI to pick the best cutaway moments + search queries, and places free stock
 * images/videos onto an overlay track above the main talking-head track.
 */
export async function runAutoInsertBrollOnTimeline({
	editor,
	lines,
	videoId,
	mediaType = "image",
}: {
	editor: EditorCore;
	lines: Array<{ clipNumber: number; line: string }>;
	videoId?: string | null;
	mediaType?: "all" | "image" | "video";
}): Promise<{ insertedCount: number; error?: string }> {
	if (lines.length === 0) {
		return { insertedCount: 0, error: "這支影片沒有對白可分析插圖" };
	}
	const scene = editor.scenes.getActiveScene();
	const slots = matchSubtitleSlots({
		elements: scene.tracks.main.elements,
		clipNumbers: lines.map((l) => l.clipNumber),
	});
	const matchedLines = lines.filter((l) => slots.has(l.clipNumber));
	if (matchedLines.length === 0) {
		return { insertedCount: 0, error: "主軌道上尚未有對應的分鏡片段" };
	}

	const planRes = await autoPlanOpencutBrollAction({
		clips: matchedLines,
		mediaType,
	});
	if (!planRes.ok) {
		return { insertedCount: 0, error: planRes.error };
	}
	if (planRes.insertions.length === 0) {
		return { insertedCount: 0, error: "找不到合適的插圖素材" };
	}

	// Remove previous auto-inserted B-Roll elements before placing the fresh set
	const freshScene = editor.scenes.getActiveScene();
	const stale = freshScene.tracks.overlay.flatMap((track) =>
		track.elements
			.filter((el) => isScroBrollElementName(el.name))
			.map((el) => ({ trackId: track.id, elementId: el.id })),
	);
	if (stale.length > 0) {
		editor.timeline.deleteElements({ elements: stale });
	}

	// Ensure a single shared overlay video track for all B-roll cutaways
	const afterDeleteScene = editor.scenes.getActiveScene();
	let sharedTrackId = afterDeleteScene.tracks.overlay.find(
		(track) => track.type === "video",
	)?.id;
	if (!sharedTrackId) {
		const addTrackCmd = new AddTrackCommand({
			type: "video",
			index: afterDeleteScene.tracks.overlay.length,
		});
		editor.command.execute({ command: addTrackCmd });
		sharedTrackId = addTrackCmd.getTrackId();
	}

	let insertedCount = 0;
	for (const ins of planRes.insertions) {
		const slot = slots.get(ins.clipNumber);
		if (!slot) continue;
		const clipStartSec = mediaTimeToSeconds({ time: slot.startTime });
		const clipDurSec = mediaTimeToSeconds({ time: slot.duration });
		// Place cutaway over the middle ~70% of the clip (or full clip if short) so the speaker transition feels natural
		const offsetSec = clipDurSec > 2.2 ? 0.35 : 0;
		const brollDurSec =
			clipDurSec > 2.2 ? Math.max(1.2, clipDurSec - 0.55) : Math.max(1.0, clipDurSec);

		const ok = await insertStockMediaOnOverlayTrack({
			editor,
			videoId,
			item: ins.media,
			startTimeSeconds: clipStartSec + offsetSec,
			durationSeconds: brollDurSec,
			elementName: `B-Roll ${ins.clipNumber} · ${ins.query}`,
			explicitTrackId: sharedTrackId,
		});
		if (ok) insertedCount++;
	}

	return { insertedCount };
}

export function StockMediaView() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const videoId = useScroSubtitleVideoId();
	const [query, setQuery] = useState("business technology");
	const [mediaType, setMediaType] = useState<"all" | "image" | "video">("all");
	const [items, setItems] = useState<FreeStockMediaItem[]>([]);
	const [searching, setSearching] = useState(false);
	const [insertingId, setInsertingId] = useState<string | null>(null);
	const [autoInserting, setAutoInserting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const runSearch = useCallback(
		async (searchQuery: string, filterType: "all" | "image" | "video") => {
			const trimmed = searchQuery.trim();
			if (!trimmed) return;
			setSearching(true);
			setError(null);
			try {
				const res = await searchOpencutStockMediaAction({
					query: trimmed,
					mediaType: filterType,
				});
				if (!res.ok) {
					setError(res.error);
					return;
				}
				setItems(res.items);
			} catch {
				setError("搜尋免費素材失敗");
			} finally {
				setSearching(false);
			}
		},
		[],
	);

	useEffect(() => {
		void runSearch("business technology", "all");
	}, [runSearch]);

	const handleInsertItem = async (item: FreeStockMediaItem) => {
		if (insertingId) return;
		setInsertingId(item.id);
		try {
			const playheadSeconds = mediaTimeToSeconds({
				time: editor.playback.getCurrentTime(),
			});
			const ok = await insertStockMediaOnOverlayTrack({
				editor,
				videoId,
				item,
				startTimeSeconds: playheadSeconds,
				durationSeconds: item.duration ?? 3.0,
			});
			if (ok) {
				toast.success(`已加插「${item.title.slice(0, 24)}」到上方覆疊軌道`);
			} else {
				toast.error("無法載入該素材檔案");
			}
		} catch {
			toast.error("插入素材失敗");
		} finally {
			setInsertingId(null);
		}
	};

	const handleAutoBroll = async () => {
		if (autoInserting) return;
		setAutoInserting(true);
		setError(null);
		try {
			const lines = catalog?.lines ?? [];
			const res = await runAutoInsertBrollOnTimeline({
				editor,
				lines,
				videoId,
				mediaType: mediaType === "video" ? "video" : "image",
			});
			if (res.error) {
				setError(res.error);
				toast.error(res.error);
			} else {
				toast.success(`已自動根據台詞在中間加插 ${res.insertedCount} 段 B-Roll 插圖！`);
			}
		} finally {
			setAutoInserting(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<div className="space-y-2.5 border-b p-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<h2 className="text-sm font-medium">免費插圖與影片素材 · B-Roll</h2>
						<p className="text-muted-foreground text-[11px]">
							輸入關鍵字搜尋免費圖片／影片，或一鍵自動加插到主軌上方
						</p>
					</div>
				</div>

				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={autoInserting || (catalog?.lines.length ?? 0) === 0}
					onClick={() => void handleAutoBroll()}
					className="w-full justify-center gap-1.5 text-xs font-semibold"
				>
					{autoInserting
						? "AI 正在分析對白並自動加插 B-Roll…"
						: "✨ 自動加入中間 B-Roll 插圖 (Auto Insert)"}
				</Button>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						void runSearch(query, mediaType);
					}}
					className="flex items-center gap-1.5"
				>
					<Input
						placeholder="搜尋素材（如 office, chart, AI, coffee）…"
						value={query}
						onChange={(e) => setQuery(e.currentTarget.value)}
						className="h-8 text-xs"
						containerClassName="flex-1"
					/>
					<Button
						type="submit"
						size="sm"
						disabled={searching || !query.trim()}
						className="h-8 px-3 text-xs"
					>
						{searching ? "…" : "搜尋"}
					</Button>
				</form>

				<div className="flex items-center justify-between gap-1">
					<div className="flex items-center gap-1">
						{(
							[
								{ id: "all", label: "全部" },
								{ id: "image", label: "圖片" },
								{ id: "video", label: "影片" },
							] as const
						).map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => {
									setMediaType(tab.id);
									void runSearch(query, tab.id);
								}}
								className={cn(
									"cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium transition",
									mediaType === tab.id
										? "bg-primary text-primary-foreground"
										: "bg-accent/60 text-muted-foreground hover:text-foreground",
								)}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				<div className="flex flex-wrap gap-1">
					{QUICK_TOPICS.map((topic) => (
						<button
							key={topic.query}
							type="button"
							onClick={() => {
								setQuery(topic.query);
								void runSearch(topic.query, mediaType);
							}}
							className="border-border/60 text-muted-foreground hover:text-foreground cursor-pointer rounded-md border px-1.5 py-0.5 text-[10px] transition"
						>
							{topic.label}
						</button>
					))}
				</div>
			</div>

			<ScrollArea className="min-h-0 flex-1 p-3">
				{error ? (
					<p className="text-destructive mb-2 text-xs">{error}</p>
				) : null}

				{searching ? (
					<p className="text-muted-foreground py-6 text-center text-xs">
						正在搜尋免費素材…
					</p>
				) : items.length === 0 ? (
					<p className="text-muted-foreground py-6 text-center text-xs">
						找不到符合的素材，請試試英文關鍵字（例如 chart, startup, phone）
					</p>
				) : (
					<div className="grid grid-cols-2 gap-2 pb-4">
						{items.map((item) => {
							const busy = insertingId === item.id;
							return (
								<button
									key={item.id}
									type="button"
									disabled={Boolean(insertingId)}
									onClick={() => void handleInsertItem(item)}
									className="group bg-muted/40 hover:border-foreground/40 relative flex cursor-pointer flex-col overflow-hidden rounded-md border border-transparent text-left transition disabled:opacity-50"
								>
									<div className="bg-muted relative aspect-video w-full overflow-hidden">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={item.thumbUrl}
											alt={item.title}
											className="h-full w-full object-cover transition group-hover:scale-105"
											loading="lazy"
										/>
										<span className="bg-background/85 text-foreground absolute top-1 left-1 rounded px-1 py-0.5 text-[9px] font-semibold uppercase">
											{item.type === "video"
												? `VIDEO${item.duration ? ` · ${item.duration}s` : ""}`
												: "IMG"}
										</span>
										<span className="bg-primary text-primary-foreground absolute right-1 bottom-1 rounded px-1.5 py-0.5 text-[10px] font-semibold opacity-0 transition group-hover:opacity-100">
											{busy ? "加入中…" : "+ 加插 Overlay"}
										</span>
									</div>
									<span className="truncate px-1.5 py-1 text-[11px] font-medium">
										{item.title}
									</span>
								</button>
							);
						})}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
