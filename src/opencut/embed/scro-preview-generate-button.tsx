"use client";

import { Button } from "@/opencut/components/ui/button";
import { useEditor } from "@/opencut/editor/use-editor";
import { resolveElementScroClipNumber } from "@/opencut/embed/scro-clip-number";
import { requestScroClipAction } from "@/opencut/embed/scro-video-actions";
import {
	scroPreviewCanStartVideo,
	scroVideoActionLabel,
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
			clips: undefined,
		});
	});
}

/**
 * Centered on the preview frame when the clip only has its start still.
 * Starts the same generate-video action as the properties panel.
 */
export function ScroPreviewGenerateButton({ scene }: { scene: PreviewSceneBox }) {
	const store = useScroVideos();
	const clipNumber = usePlayheadScroClipNumber();
	const clip = store?.clips.find((item) => item.clipNumber === clipNumber);
	if (!store || clipNumber == null || !clip || !scroPreviewCanStartVideo(clip)) {
		return null;
	}
	if (scene.width < 1 || scene.height < 1) return null;

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
