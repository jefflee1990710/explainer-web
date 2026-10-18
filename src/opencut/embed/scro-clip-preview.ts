import { resolveElementScroClipNumber } from "@/opencut/embed/scro-clip-number";
import { getScroVideos } from "@/opencut/embed/scro-video-store";
import type { EditorCore } from "@/opencut/core";
import type { TimelineElement } from "@/opencut/timeline";
import type { MediaTime } from "@/opencut/wasm";

/** Where the center preview should go when a Scro clip is clicked. */
export function scroClipPreviewPlan({
	currentTime,
	startTime,
	duration,
	shouldPlay,
}: {
	currentTime: MediaTime;
	startTime: MediaTime;
	duration: MediaTime;
	shouldPlay: boolean;
}): { seekTo: MediaTime | null; play: boolean } {
	const end = startTime + duration;
	const inside = currentTime >= startTime && currentTime < end;
	return {
		seekTo: inside ? null : startTime,
		play: shouldPlay,
	};
}

/**
 * Move the center preview onto a Scro clip and play it.
 * A clip the playhead is already inside keeps its current frame, then plays.
 */
export function showScroClipInPreview({
	editor,
	element,
}: {
	editor: EditorCore;
	element: TimelineElement;
}) {
	if (element.type !== "video" && element.type !== "image") return;
	const assets = editor.media.getAssets();
	const clipNumber = resolveElementScroClipNumber({
		element,
		assets,
		clips: getScroVideos()?.clips,
	});
	if (clipNumber == null) return;

	const asset =
		"mediaId" in element
			? assets.find((item) => item.id === element.mediaId)
			: undefined;
	const plan = scroClipPreviewPlan({
		currentTime: editor.playback.getCurrentTime(),
		startTime: element.startTime,
		duration: element.duration,
		shouldPlay: asset?.scroPlaceholder !== true,
	});
	if (plan.seekTo != null) {
		editor.playback.seek({ time: plan.seekTo });
	}
	if (plan.play) editor.playback.play();
}
