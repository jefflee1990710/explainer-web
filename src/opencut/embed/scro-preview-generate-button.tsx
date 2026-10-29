"use client";

import { Button } from "@/opencut/components/ui/button";
import { Spinner } from "@/opencut/components/ui/spinner";
import { useEditor } from "@/opencut/editor/use-editor";
import { resolveElementScroClipNumber } from "@/opencut/embed/scro-clip-number";
import { requestScroClipAction } from "@/opencut/embed/scro-video-actions";
import {
	scroClipIsGeneratingVideo,
	scroPreviewCanStartVideo,
	scroVideoActionLabel,
	scroVideoGeneratingLabel,
} from "@/opencut/embed/scro-preview-generate";
import { useScroVideos } from "@/opencut/embed/scro-video-store";

type PreviewSceneBox = {
	left: number;
	top: number;
	width: number;
	height: number;
};

/** Playhead clip when the preview is showing a storyboard still or video. */
function usePlayheadScroClipNumber() {
	const store = useScroVideos();
	return useEditor((editor) => {
		const time = editor.playback.getCurrentTime();
		const scene = editor.scenes.getActiveScene();
		const element = scene.tracks.main.elements.find((item) => {
			if (item.type !== "image" && item.type !== "video") return false;
			return time >= item.startTime && time < item.startTime + item.duration;
		});
		if (!element) return null;
		return resolveElementScroClipNumber({
			element,
			assets: editor.media.getAssets(),
			clips: store?.clips,
		});
	});
}

/**
 * Centered on the preview frame when the clip only has its start still (or is generating its video).
 * Shows a live "Generating video…" indicator while rendering, or starts the generate-video action.
 */
export function ScroPreviewGenerateButton({ scene }: { scene: PreviewSceneBox }) {
	const store = useScroVideos();
	const clipNumber = usePlayheadScroClipNumber();
	const clip = store?.clips.find((item) => item.clipNumber === clipNumber);
	const isGeneratingVideo = scroClipIsGeneratingVideo(clip);
	const canStartVideo = scroPreviewCanStartVideo(clip);

	if (!store || clipNumber == null || !clip || (!canStartVideo && !isGeneratingVideo)) {
		return null;
	}
	if (scene.width < 1 || scene.height < 1) return null;

	if (isGeneratingVideo) {
		const statusLabel = scroVideoGeneratingLabel(clip);
		return (
			<div
				className="pointer-events-none absolute z-30 flex items-center justify-center"
				style={{
					left: scene.left,
					top: scene.top,
					width: scene.width,
					height: scene.height,
				}}
				role="status"
				aria-live="polite"
			>
				<div className="flex items-center gap-2.5 rounded-full border border-white/35 bg-black/55 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md">
					<Spinner className="size-4 shrink-0 text-amber-400" />
					<span>{statusLabel}</span>
				</div>
			</div>
		);
	}

	const label = scroVideoActionLabel(clip);

	return (
		<div
			className="pointer-events-none absolute z-30 flex items-center justify-center"
			style={{
				left: scene.left,
				top: scene.top,
				width: scene.width,
				height: scene.height,
			}}
		>
			<Button
				size="lg"
				// Translucent so the still underneath stays visible.
				className="pointer-events-auto border border-white/40 bg-black/30 text-white backdrop-blur-sm hover:bg-black/45"
				onPointerDown={(event) => event.stopPropagation()}
				onClick={(event) => {
					event.stopPropagation();
					requestScroClipAction({
						videoId: store.videoId,
						clipNumber,
						action: "generate-video",
					});
				}}
			>
				{label}
			</Button>
		</div>
	);
}
