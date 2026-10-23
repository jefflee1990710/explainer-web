import type { TrackType } from "@/opencut/timeline";

export const TIMELINE_TRACK_HEIGHTS_PX: Record<TrackType, number> = {
	video: 44,
	text: 34,
	audio: 38,
	graphic: 34,
	effect: 32,
} as const;

export const KEYFRAME_LANE_HEIGHT_PX = 20;
export const KEYFRAME_DIAMOND_SIZE_PX = 14;
export const EXPANDED_GROUP_HEADER_HEIGHT_PX = 18;

export const TIMELINE_TRACK_GAP_PX = 8;
export const TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX = 120;
export const TIMELINE_RULER_HEIGHT_PX = 24;
export const TIMELINE_BOOKMARK_ROW_HEIGHT_PX = 16;
export const TIMELINE_SCROLLBAR_SIZE_PX = 12;
export const TIMELINE_CONTENT_TOP_PADDING_PX = 6;
