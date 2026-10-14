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

/** Keep one media row per Scro clip (prefer video over still), then other assets. */
export function mergeScroMediaAssets({
	assets,
	clips,
}: {
	assets: MediaAsset[];
	clips: ScroVideoSeedClip[] | undefined;
}): MediaAsset[] {
	const byClip = new Map<number, MediaAsset>();
	const other: MediaAsset[] = [];
	for (const asset of assets) {
		const clipNumber = resolveScroClipNumber({ asset, clips });
		if (clipNumber == null) {
			other.push(asset);
			continue;
		}
		const prev = byClip.get(clipNumber);
		if (!prev || (asset.type === "video" && prev.type !== "video")) {
			byClip.set(clipNumber, asset);
		}
	}

	const orderedScro: MediaAsset[] = [];
	const seen = new Set<number>();
	for (const clip of clips ?? []) {
		const asset = byClip.get(clip.clipNumber);
		if (!asset) continue;
		orderedScro.push(asset);
		seen.add(clip.clipNumber);
	}
	for (const [clipNumber, asset] of [...byClip.entries()].sort(
		(a, b) => a[0] - b[0],
	)) {
		if (seen.has(clipNumber)) continue;
		orderedScro.push(asset);
	}
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
}: {
	clipNumber: number;
	className?: string;
}) {
	const store = useScroVideos();
	const clip = store?.clips.find((item) => item.clipNumber === clipNumber);
	const loading = clip
		? clip.stage === "awaiting_frames" ||
			clip.stage === "frames_generating" ||
			clip.stage === "video_generating"
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
				<div className="absolute inset-0 grid place-items-center bg-black/35 text-[0.65rem] text-white">
					Loading…
				</div>
			) : null}
			{clip ? (
				<span
					className={cn(
						"absolute right-1 bottom-1 rounded px-1 py-0.5 text-[0.6rem]",
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
