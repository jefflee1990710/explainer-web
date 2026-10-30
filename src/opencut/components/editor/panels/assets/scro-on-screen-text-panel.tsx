"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/opencut/commands";
import { useEditor } from "@/opencut/editor/use-editor";
import { fetchMediaBlobWithTimeout } from "@/opencut/embed/scro-media-load";
import { armScroSync, rememberClipSource } from "@/opencut/embed/scro-media-sources";
import {
	addScroGeneratedOnScreenText,
	useScroGeneratedOnScreenText,
	useScroSubtitleCatalog,
	useScroSubtitleVideoId,
} from "@/opencut/embed/scro-subtitle-store";
import { ScroOnScreenTextDialog } from "@/opencut/components/editor/panels/assets/scro-on-screen-text-dialog";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import { processMediaAssets } from "@/opencut/media/processing";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";
import { generateOpencutOnScreenTextAction } from "@/presentation/actions/opencut-subtitle";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { cn } from "@/opencut/utils/ui";

const DEFAULT_ON_SCREEN_TEXT_DURATION_SEC = 3;

// Panel listing AI-generated subtitle style images; clicking any card pops a dialog with a textarea
// to generate an AI subtitle text graphic onto the timeline.
export function ScroOnScreenTextPanel() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const videoId = useScroSubtitleVideoId();
	const generatedItems = useScroGeneratedOnScreenText();
	const { oc } = useOpencutI18n();

	const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const styles = catalog?.styles ?? [];
	const activeStyleId =
		selectedStyleId && styles.some((style) => style.id === selectedStyleId)
			? selectedStyleId
			: catalog?.selectedId ?? styles[0]?.id ?? "";
	const selectedStyle =
		styles.find((style) => style.id === activeStyleId) ?? styles[0] ?? null;

	// Insert a generated transparent PNG subtitle graphic onto an overlay track at the playhead.
	const insertGeneratedImageOnTimeline = async ({
		url,
		text,
	}: {
		url: string;
		text: string;
	}): Promise<boolean> => {
		const project = editor.project.getActiveOrNull();
		if (!project) return false;

		const blob = await fetchMediaBlobWithTimeout({ url });
		if (!blob) return false;
		const safeLabel = text.replace(/\s+/g, " ").trim().slice(0, 32) || "On-Screen Text";
		const file = new File([blob], `${safeLabel}.png`, { type: "image/png" });
		const processed = await processMediaAssets({ files: [file] });
		const first = processed[0];
		if (!first) return false;

		const createdAsset = await editor.media.addMediaAsset({
			projectId: project.metadata.id,
			asset: {
				...first,
				sourceUrl: url,
			},
		});
		if (!createdAsset) return false;
		if (videoId) {
			rememberClipSource(videoId, createdAsset.id, url);
		}

		const scene = editor.scenes.getActiveScene();
		const existingTrack = scene.tracks.overlay.find((track) => track.type === "video");
		let trackId = existingTrack?.id;
		let addTrackCmd: AddTrackCommand | null = null;
		if (!trackId) {
			addTrackCmd = new AddTrackCommand({
				type: "video",
				index: 0,
				name: oc.onScreenText.title,
			});
			trackId = addTrackCmd.getTrackId();
		}

		const playheadSeconds = mediaTimeToSeconds({
			time: editor.playback.getCurrentTime(),
		});
		const baseElement = buildElementFromMedia({
			mediaId: createdAsset.id,
			mediaType: "image",
			name: `Text · ${safeLabel}`,
			startTime: mediaTimeFromSeconds({ seconds: Math.max(0, playheadSeconds) }),
			duration: mediaTimeFromSeconds({ seconds: DEFAULT_ON_SCREEN_TEXT_DURATION_SEC }),
		});
		const element = {
			...baseElement,
			params: {
				...baseElement.params,
				"transform.scaleX": 0.88,
				"transform.scaleY": 0.88,
				"transform.positionX": 0,
				"transform.positionY": 0,
			},
		};

		const insertCmd = new InsertElementCommand({
			placement: { mode: "explicit", trackId },
			element,
		});
		editor.command.execute({
			command: addTrackCmd ? new BatchCommand([addTrackCmd, insertCmd]) : insertCmd,
		});
		armScroSync();
		return true;
	};

	const handleGenerate = async (rawText: string) => {
		const trimmed = rawText.trim();
		if (!trimmed) {
			setError(oc.onScreenText.emptyTextError);
			return;
		}
		if (!videoId || !selectedStyle || busy) return;

		setBusy(true);
		setError(null);
		try {
			const res = await generateOpencutOnScreenTextAction({
				videoId,
				textStyleId: selectedStyle.id,
				text: trimmed,
			});
			notifyTasksChanged();
			if (!res.ok) {
				setError(res.error || oc.onScreenText.failedError);
				return;
			}

			addScroGeneratedOnScreenText({
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				text: res.text,
				styleId: selectedStyle.id,
				styleName: selectedStyle.name,
				url: res.url,
				createdAt: Date.now(),
			});

			const inserted = await insertGeneratedImageOnTimeline({
				url: res.url,
				text: res.text,
			});
			if (inserted) {
				toast.success(oc.onScreenText.addedToast);
			}
			setDialogOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : oc.onScreenText.failedError);
		} finally {
			setBusy(false);
		}
	};

	if (!catalog) {
		return <div className="text-muted-foreground p-4 text-sm">…</div>;
	}

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
				<div>
					<h2 className="text-sm font-medium">{oc.onScreenText.title}</h2>
					<p className="text-muted-foreground mt-1 text-xs leading-snug">
						{oc.onScreenText.hint}
					</p>
				</div>

				{generatedItems.length > 0 ? (
					<div className="space-y-2">
						<div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
							{oc.onScreenText.generatedHeading}
						</div>
						<div className="grid grid-cols-2 gap-2">
							{generatedItems.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => {
										void insertGeneratedImageOnTimeline({
											url: item.url,
											text: item.text,
										}).then((ok) => {
											if (ok) toast.success(oc.onScreenText.addedToast);
										});
									}}
									className="group border-border/70 hover:border-foreground flex cursor-pointer flex-col gap-1 rounded-md border p-1.5 text-left transition"
								>
									<div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm bg-[#12141c] p-1">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={item.url}
											alt={item.text}
											className="max-h-full max-w-full object-contain"
										/>
									</div>
									<span className="truncate text-xs font-medium">{item.text}</span>
									<span className="text-muted-foreground truncate text-[10px]">
										{item.styleName} · {oc.onScreenText.insertAgain}
									</span>
								</button>
							))}
						</div>
					</div>
				) : null}

				<div className="space-y-2">
					<div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
						{oc.onScreenText.stylesHeading}
					</div>
					<div
						className="grid grid-cols-2 gap-2"
						role="listbox"
						aria-label={oc.onScreenText.stylesHeading}
					>
						{styles.map((style) => {
							const active = style.id === activeStyleId;
							return (
								<button
									key={style.id}
									type="button"
									role="option"
									aria-selected={active}
									onClick={() => {
										setSelectedStyleId(style.id);
										setError(null);
										setDialogOpen(true);
									}}
									className={cn(
										"group flex cursor-pointer flex-col gap-1 rounded-md border p-1.5 text-left transition",
										active
											? "border-foreground bg-secondary shadow-xs"
											: "border-border/60 hover:border-foreground/50 hover:bg-muted/60",
									)}
								>
									<div className="bg-muted relative aspect-video w-full overflow-hidden rounded-sm">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={style.previewUrl}
											alt={style.name}
											className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
										/>
									</div>
									<span className="truncate px-0.5 text-xs font-medium">
										{style.name}
									</span>
									<span className="text-muted-foreground truncate px-0.5 text-[10px]">
										{oc.onScreenText.clickToType}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<ScroOnScreenTextDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				styles={styles}
				selectedStyle={selectedStyle}
				busy={busy}
				error={error}
				onSelectStyle={(id) => {
					setSelectedStyleId(id);
					setError(null);
				}}
				onGenerate={(text) => void handleGenerate(text)}
			/>
		</div>
	);
}
