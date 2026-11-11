"use client";

import { useEditor } from "@/opencut/editor/use-editor";
import {
	autoAudioLaneForTrack,
	useAutoAudioBusy,
} from "@/opencut/embed/scro-auto-audio-busy";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import type { TimelineTrack } from "@/opencut/timeline";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/opencut/timeline/scale";
import { mediaTimeToSeconds } from "@/opencut/wasm";

/**
 * Full-width loader painted on the SFX or BGM track while that auto insert is running.
 */
export function AutoAudioLaneLoading({
	track,
	zoomLevel,
}: {
	track: TimelineTrack;
	zoomLevel: number;
}) {
	const busy = useAutoAudioBusy();
	const lane = autoAudioLaneForTrack(track);
	const scene = useEditor((editor) => editor.scenes.getActiveSceneOrNull());
	const { oc } = useOpencutI18n();
	const active = lane === "sfx" ? busy.sfx : lane === "bgm" ? busy.bgm : false;
	if (!lane || !active) return null;

	let endSec = 4;
	for (const element of scene?.tracks.main.elements ?? []) {
		const elEnd =
			mediaTimeToSeconds({ time: element.startTime }) +
			mediaTimeToSeconds({ time: element.duration });
		if (elEnd > endSec) endSec = elEnd;
	}
	const width = Math.max(
		160,
		endSec * BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel,
	);

	return (
		<div
			className="border-primary/40 bg-primary/15 text-primary pointer-events-none absolute inset-y-1 left-0 flex items-center gap-2 overflow-hidden rounded-md border px-2.5"
			style={{ width, zIndex: 12 }}
			role="status"
			aria-live="polite"
		>
			<span className="border-primary/30 border-t-primary size-3.5 shrink-0 animate-spin rounded-full border-2" />
			<span className="truncate text-xs font-medium">
				{lane === "sfx" ? oc.sfx.autoSfxBusy : oc.bgm.autoBgmBusy}
			</span>
		</div>
	);
}
