import type { TrackType } from "@/opencut/timeline";

export const TIMELINE_AUDIO_WAVEFORM_COLOR = "rgba(198, 242, 75, 0.85)";

export const TIMELINE_TRACK_THEME: Record<
	TrackType,
	{
		elementClassName: string;
		waveformColor?: string;
	}
> = {
	video: { elementClassName: "bg-[#2b303c] text-white" },
	text: { elementClassName: "bg-[#646c7a] text-white" },
	audio: {
		elementClassName: "bg-[#1b1f2a] text-white",
		waveformColor: TIMELINE_AUDIO_WAVEFORM_COLOR,
	},
	graphic: { elementClassName: "bg-[#4b5563] text-white" },
	effect: { elementClassName: "bg-[#3b4252] text-white" },
} as const;

export const SELECTED_TRACK_ROW_CLASS = "bg-accent/40";
export const DEFAULT_TIMELINE_BOOKMARK_COLOR = "#a3e635";

export function getTimelineElementClassName({
	type,
}: {
	type: TrackType;
}): string {
	return TIMELINE_TRACK_THEME[type].elementClassName.trim();
}
