"use client";

import Image from "next/image";
import {
	useScroVideos,
	getScroVideos,
	setScroVideoSelection,
	toggleScroVideoChecked,
} from "@/opencut/embed/scro-video-store";
import {
	resolveElementScroClipNumber,
	resolveScroClipNumber,
} from "@/opencut/embed/scro-clip-number";

export { resolveScroClipNumber };
import type { ScroVideoSeedClip, ScroVideoUiStage } from "@/opencut/embed/scro-video-types";
import type { EditorCore } from "@/opencut/core";
import type { MediaAsset } from "@/opencut/media/types";
import { MediaLoadingMark } from "@/opencut/components/loading-media-image";
import { cn } from "@/opencut/utils/ui";

export const SCRO_STAGE_LABEL: Record<ScroVideoUiStage, string> = {
	awaiting_frames: "Waiting",
	frames_generating: "Drawing",
	frames_ready: "Stills ready",
	video_generating: "Rendering",
	video_ready: "Ready",
	failed: "Failed",
};

export function scroStageTone(stage: ScroVideoUiStage) {
	if (stage === "failed") return "bg-red-500/15 text-red-700";
	if (stage === "video_ready") return "bg-emerald-500/15 text-emerald-800";
	if (stage === "frames_generating" || stage === "video_generating") {
		return "bg-amber-500/15 text-amber-900";
	}
	return "bg-muted text-muted-foreground";
}

/** The new start still is not ready yet, so the previous picture must not stay up. */
export function scroStartStillPending(
	clip?: Pick<ScroVideoSeedClip, "stage" | "posterUrl" | "hasStartFrame"> | null,
) {
	if (!clip) return false;
	if (clip.stage !== "awaiting_frames" && clip.stage !== "frames_generating") return false;
	return !clip.posterUrl || clip.hasStartFrame === false;
}

/**
 * Thumb to show for a storyboard clip.
 * After a regenerate, the old video file stays in the library until the new
 * video exists. Once the new start still is ready, that still is the preview.
 * While that still is drawing, return nothing so the old frame is cleared.
 */
export function scroAssetPreviewSrc({
	asset,
	clip,
}: {
	asset: Pick<MediaAsset, "type" | "url" | "thumbnailUrl">;
	clip?: Pick<ScroVideoSeedClip, "stage" | "posterUrl" | "hasStartFrame" | "staleVideo"> | null;
}): string | undefined {
	if (scroStartStillPending(clip)) return undefined;
	if (clip?.posterUrl && (clip.stage !== "video_ready" || clip.staleVideo)) {
		return clip.posterUrl;
	}
	if (asset.type === "video") return asset.thumbnailUrl ?? clip?.posterUrl;
	return asset.url ?? asset.thumbnailUrl ?? clip?.posterUrl;
}

/** Scene stills stay on the timeline. The Assets panel lists the clip video, not the picture. */
export function isScroSceneStill({
	asset,
	clips,
}: {
	asset: Pick<
		MediaAsset,
		"type" | "url" | "thumbnailUrl" | "scroClipNumber" | "scroPosterUrl" | "scroPlaceholder"
	>;
	clips: ScroVideoSeedClip[] | undefined;
}): boolean {
	if (asset.type !== "image") return false;
	if (asset.scroPlaceholder || asset.scroClipNumber != null) return true;
	if (!clips?.length) return false;
	const stillUrls = new Set<string>();
	for (const clip of clips) {
		if (clip.posterUrl) stillUrls.add(clip.posterUrl);
		if (clip.endPosterUrl) stillUrls.add(clip.endPosterUrl);
	}
	return [asset.url, asset.thumbnailUrl, asset.scroPosterUrl].some(
		(url) => Boolean(url && stillUrls.has(url)),
	);
}

/** One library row for this clip: the newest finished video. Scene stills are not assets. */
export function pickScroClipAsset({
	clip,
	assets,
	clips,
}: {
	clip: ScroVideoSeedClip;
	assets: MediaAsset[];
	clips: ScroVideoSeedClip[] | undefined;
}): MediaAsset | undefined {
	const matches = assets.filter(
		(asset) =>
			asset.type === "video" &&
			resolveScroClipNumber({ asset, clips }) === clip.clipNumber,
	);
	if (matches.length === 0) return undefined;
	return matches[matches.length - 1];
}

/** Keep one media row per Scro clip, then assets that are not storyboard clips. */
export function mergeScroMediaAssets({
	assets,
	clips,
}: {
	assets: MediaAsset[];
	clips: ScroVideoSeedClip[] | undefined;
}): MediaAsset[] {
	if (!clips?.length) return assets;
	const used = new Set<string>();
	const orderedScro: MediaAsset[] = [];
	for (const clip of clips) {
		const asset = pickScroClipAsset({ clip, assets, clips });
		if (!asset || used.has(asset.id)) continue;
		orderedScro.push(asset);
		used.add(asset.id);
	}
	const other = assets.filter((asset) => {
		if (used.has(asset.id)) return false;
		// Drop start/end scene stills. Opening and Ending videos are separate cards.
		if (isScroSceneStill({ asset, clips })) return false;
		return resolveScroClipNumber({ asset, clips }) == null;
	});
	return [...orderedScro, ...other];
}

export function scroDisplayName({
	asset,
	clips,
}: {
	asset: MediaAsset;
	clips: ScroVideoSeedClip[] | undefined;
}): string {
	const clipNumber = resolveScroClipNumber({ asset, clips });
	if (clipNumber == null) return asset.name;
	const clip = clips?.find((item) => item.clipNumber === clipNumber);
	return clip?.name ?? `Clip ${clipNumber}`;
}

/** Stage badge, bulk checkbox, and Scro mark for a Scro media thumb. */
export function ScroMediaOverlays({
	clipNumber,
	className,
	reserveCorner = false,
}: {
	clipNumber: number;
	className?: string;
	/** Leave the bottom-right corner for the video length chip. */
	reserveCorner?: boolean;
}) {
	const store = useScroVideos();
	const clip = store?.clips.find((item) => item.clipNumber === clipNumber);
	// A new start still clears the previous picture. The veil stays while that
	// image is missing, or while the new video itself is rendering.
	const pendingStill = scroStartStillPending(clip);
	const startStillVisible =
		Boolean(clip?.posterUrl) &&
		!pendingStill &&
		clip?.stage !== "video_ready" &&
		clip?.stage !== "video_generating";
	const loading = pendingStill
		? true
		: clip
			? (clip.stage === "awaiting_frames" ||
					clip.stage === "frames_generating" ||
					clip.stage === "video_generating") &&
				!startStillVisible
			: false;

	return (
		<div className={cn("pointer-events-none absolute inset-0 z-10", className)}>
			<label
				className="pointer-events-auto absolute top-1 left-1 flex size-5 items-center justify-center rounded-sm bg-black/45"
				onClick={(event) => event.stopPropagation()}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<input
					type="checkbox"
					checked={store?.checkedClipNumbers.includes(clipNumber) ?? false}
					onChange={() => toggleScroVideoChecked(clipNumber)}
					className="size-3.5 accent-[var(--primary)]"
					aria-label={`Select Clip ${clipNumber}`}
				/>
			</label>
			{/* Scro mark — identifies storyboard clips in the shared Assets grid. */}
			<span className="absolute top-1 right-1 size-5 overflow-hidden rounded-[4px] shadow-sm ring-1 ring-black/20">
				<Image
					src="/logo-mark.png"
					alt=""
					width={40}
					height={40}
					className="size-full object-cover"
					unoptimized
				/>
			</span>
			{loading ? (
				<MediaLoadingMark
					className={
						pendingStill ? "bg-muted text-foreground" : "bg-black/35 text-white"
					}
				/>
			) : null}
			{clip ? (
				<span
					className={cn(
						"absolute bottom-1 rounded px-1 py-0.5 text-[0.6rem]",
						reserveCorner ? "left-1" : "right-1",
						scroStageTone(clip.stage),
					)}
				>
					{SCRO_STAGE_LABEL[clip.stage]}
				</span>
			) : null}
		</div>
	);
}

/** Select timeline element + Properties focus for a Scro media asset. */
export function selectScroMediaClip({
	clipNumber,
	editor,
}: {
	clipNumber: number;
	editor: EditorCore;
}) {
	setScroVideoSelection(clipNumber);
	const scene = editor.scenes.getActiveScene();
	const clips = getScroVideos()?.clips;
	const assets = editor.media.getAssets();
	// Restored clips may only be named "Clip N.mp4" and lack scroClipNumber.
	const hit = scene.tracks.main.elements.find(
		(element) =>
			resolveElementScroClipNumber({ element, assets, clips }) === clipNumber,
	);
	if (hit) {
		editor.selection.setSelectedElements({
			elements: [{ trackId: scene.tracks.main.id, elementId: hit.id }],
		});
		return;
	}
	// Asset-only focus: clear timeline so Properties reads the Scro store selection.
	editor.selection.setSelectedElements({ elements: [] });
}
