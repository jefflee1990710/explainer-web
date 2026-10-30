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
import { getScroVideos } from "@/opencut/embed/scro-video-store";
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
import {
	computeBrollPlacement,
	inferCharacterHorizontalSide,
	type BrollLayoutMode,
	type CharacterHorizontalSide,
	type FreeStockMediaItem,
} from "@/service/opencut/stock-media";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
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
	layoutMode = "pip",
	characterSide = "center",
}: {
	editor: EditorCore;
	videoId?: string | null;
	item: FreeStockMediaItem;
	startTimeSeconds: number;
	durationSeconds: number;
	elementName?: string;
	explicitTrackId?: string;
	layoutMode?: BrollLayoutMode;
	characterSide?: CharacterHorizontalSide;
}): Promise<string | null> {
	const project = editor.project.getActiveOrNull();
	if (!project) return null;

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
		if (!blob) return null;
		const mime = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
		const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
		const file = new File([blob], `${item.title.slice(0, 40)}.${ext}`, { type: mime });
		const processed = await processMediaAssets({ files: [file] });
		const first = processed[0];
		if (!first) return null;
		createdAsset = await editor.media.addMediaAsset({
			projectId: project.metadata.id,
			asset: {
				...first,
				sourceUrl: item.sourceUrl,
			},
		});
	}

	if (!createdAsset) return null;
	if (videoId) {
		rememberClipSource(videoId, createdAsset.id, item.sourceUrl);
	}

	const scene = editor.scenes.getActiveScene();
	const liveExplicitTrack = explicitTrackId
		? scene.tracks.overlay.find((track) => track.id === explicitTrackId)
		: undefined;
	let trackId = liveExplicitTrack?.id;
	let addTrackCmd: AddTrackCommand | null = null;

	if (!trackId) {
		const existingOverlayVideoTrack = scene.tracks.overlay.find(
			(track) => track.type === "video",
		);
		if (existingOverlayVideoTrack) {
			trackId = existingOverlayVideoTrack.id;
		} else {
			// Create the track at the bottom of overlay tracks (below text tracks so subtitles stay on top)
			// and insert the first element inside ONE BatchCommand so EditorCore's empty-track pruner keeps it.
			addTrackCmd = new AddTrackCommand({
				type: "video",
				index: scene.tracks.overlay.length,
			});
			trackId = addTrackCmd.getTrackId();
		}
	}

	const canvasSize = project.settings.canvasSize;
	const placement = computeBrollPlacement({
		clipStartSec: startTimeSeconds,
		clipDurSec: durationSeconds,
		canvasSize,
		sourceWidth: createdAsset.width ?? item.width,
		sourceHeight: createdAsset.height ?? item.height,
		layoutMode,
		characterSide,
	});

	const baseElement = buildElementFromMedia({
		mediaId: createdAsset.id,
		mediaType: createdAsset.type,
		name: elementName ?? `B-Roll · ${item.title.slice(0, 28)}`,
		startTime: mediaTimeFromSeconds({ seconds: Math.max(0, startTimeSeconds) }),
		duration: mediaTimeFromSeconds({ seconds: Math.max(0.8, durationSeconds) }),
	});
	const element = {
		...baseElement,
		params: {
			...baseElement.params,
			"transform.scaleX": placement.scaleX,
			"transform.scaleY": placement.scaleY,
			"transform.positionX": placement.positionX,
			"transform.positionY": placement.positionY,
		},
	};

	const insertCmd = new InsertElementCommand({
		placement: { mode: "explicit", trackId },
		element,
	});

	editor.command.execute({
		command: addTrackCmd ? new BatchCommand([addTrackCmd, insertCmd]) : insertCmd,
	});
	const actualTrackId = insertCmd.getTrackId() ?? trackId;
	const verifyScene = editor.scenes.getActiveScene();
	const landed = verifyScene.tracks.overlay.some(
		(track) =>
			track.id === actualTrackId &&
			track.elements.some((el) => el.id === insertCmd.getElementId()),
	);
	if (!landed) return null;
	armScroSync();
	return actualTrackId;
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
	layoutMode = "pip",
}: {
	editor: EditorCore;
	lines: Array<{ clipNumber: number; line: string }>;
	videoId?: string | null;
	mediaType?: "all" | "image" | "video";
	layoutMode?: BrollLayoutMode;
}): Promise<{ insertedCount: number; error?: string }> {
	if (lines.length === 0) {
		return { insertedCount: 0, error: "這支影片沒有對白可分析插圖" };
	}
	const project = editor.project.getActiveOrNull();
	if (!project) {
		return { insertedCount: 0, error: "專案尚未載入" };
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

	let sharedTrackId = editor.scenes
		.getActiveScene()
		.tracks.overlay.find((track) => track.type === "video")?.id;

	const canvasSize = project.settings.canvasSize;
	const seedClips = getScroVideos()?.clips ?? [];
	let insertedCount = 0;
	for (const ins of planRes.insertions) {
		const slot = slots.get(ins.clipNumber);
		if (!slot) continue;
		const clipStartSec = mediaTimeToSeconds({ time: slot.startTime });
		const clipDurSec = mediaTimeToSeconds({ time: slot.duration });
		const seedClip = seedClips.find((c) => c.clipNumber === ins.clipNumber);
		const characterSide = inferCharacterHorizontalSide(seedClip?.explainerScene);
		const placement = computeBrollPlacement({
			clipStartSec,
			clipDurSec,
			canvasSize,
			sourceWidth: ins.media.width,
			sourceHeight: ins.media.height,
			layoutMode,
			characterSide,
		});

		const usedTrackId = await insertStockMediaOnOverlayTrack({
			editor,
			videoId,
			item: ins.media,
			startTimeSeconds: placement.startTimeSeconds,
			durationSeconds: placement.durationSeconds,
			elementName: `B-Roll ${ins.clipNumber} · ${ins.query}`,
			explicitTrackId: sharedTrackId,
			layoutMode,
			characterSide,
		});
		if (usedTrackId) {
			sharedTrackId = usedTrackId;
			insertedCount++;
		}
	}

	if (insertedCount === 0) {
		return { insertedCount: 0, error: "無法載入並加插 B-Roll 素材到時間軸" };
	}

	return { insertedCount };
}

export function StockMediaView() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const videoId = useScroSubtitleVideoId();
	const { oc } = useOpencutI18n();
	const [query, setQuery] = useState("business technology");
	const [mediaType, setMediaType] = useState<"all" | "image" | "video">("all");
	const [layoutMode, setLayoutMode] = useState<BrollLayoutMode>("pip");
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
				durationSeconds: item.duration ?? 2.4,
				layoutMode,
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
				layoutMode,
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
						<h2 className="text-sm font-medium">{oc.stock.title}</h2>
						<p className="text-muted-foreground text-[11px]">
							{oc.stock.subtitle}
						</p>
					</div>
				</div>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						void runSearch(query, mediaType);
					}}
					className="flex items-center gap-1.5"
				>
					<Input
						placeholder={oc.stock.searchPlaceholder}
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
						{searching ? "…" : oc.stock.searchBtn}
					</Button>
				</form>

				<div className="flex flex-wrap items-center justify-between gap-1.5">
					<div className="flex items-center gap-1">
						{(
							[
								{ id: "all", label: oc.stock.filterAll },
								{ id: "image", label: oc.stock.filterImage },
								{ id: "video", label: oc.stock.filterVideo },
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

					<div className="flex items-center gap-1" title="B-Roll layout mode">
						{(
							[
								{ id: "pip", label: oc.stock.layoutPip },
								{ id: "cover", label: oc.stock.layoutCover },
							] as const
						).map((mode) => (
							<button
								key={mode.id}
								type="button"
								onClick={() => setLayoutMode(mode.id)}
								className={cn(
									"cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium transition",
									layoutMode === mode.id
										? "bg-primary text-primary-foreground"
										: "bg-accent/60 text-muted-foreground hover:text-foreground",
								)}
							>
								{mode.label}
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
						{oc.stock.searching}
					</p>
				) : items.length === 0 ? (
					<p className="text-muted-foreground py-6 text-center text-xs">
						{oc.stock.noResults}
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
											{busy ? oc.stock.addingOverlay : oc.stock.addOverlay}
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
