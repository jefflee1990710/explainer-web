import type { EditorCore } from "@/opencut/core";
import type { TimelineElement } from "@/opencut/timeline";
import type { MediaTime } from "@/opencut/wasm";

/** Where the center preview should go when a Scro clip is clicked: jump to clip start without auto-playing. */
export function scroClipPreviewPlan({
	startTime,
}: {
	currentTime: MediaTime;
	startTime: MediaTime;
	duration: MediaTime;
	shouldPlay?: boolean;
}): { seekTo: MediaTime | null; play: boolean } {
	return {
		seekTo: startTime,
		play: false,
	};
}

/**
 * Move the center preview onto the start of a clicked clip without starting playback.
 */
export function showScroClipInPreview({
	editor,
	element,
}: {
	editor: EditorCore;
	element: TimelineElement;
}) {
	if (element.type !== "video" && element.type !== "image") return;

	if (editor.playback.getIsPlaying()) {
		editor.playback.pause();
	}
	const plan = scroClipPreviewPlan({
		currentTime: editor.playback.getCurrentTime(),
		startTime: element.startTime,
		duration: element.duration,
	});
	if (plan.seekTo != null) {
		editor.playback.seek({ time: plan.seekTo });
	}
}
