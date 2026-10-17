import type { ScroVideoUiStage } from "@/service/scro-video/view-model";
import type { FramePosition } from "@/model/project";

export type { ScroVideoUiStage };

/** Seed / Assets / Properties row for one storyboard clip. */
export type ScroVideoSeedClip = {
	clipNumber: number;
	durationSeconds: number;
	stage: ScroVideoUiStage;
	posterUrl?: string;
	/** Completed still the video ends on. Shown beside the start so it can be added on its own. */
	endPosterUrl?: string;
	/** Talking-head: the end is this later clip's start still, not an end of its own. */
	endFromClipNumber?: number;
	/** The still the video ends on is drawing. */
	endPending?: boolean;
	videoUrl?: string;
	name: string;
	timeRange?: string;
	englishVo?: string;
	startVo?: string;
	endVo?: string;
	explainerScene?: string;
	motionCamera?: string;
	error?: string;
	/** Start still exists (for redraw / thumbs). */
	hasStartFrame?: boolean;
	/** End still exists when dual-beat / end required. */
	hasEndFrame?: boolean;
	dualBeat?: boolean;
	frameCost?: number;
	videoCost?: number;
	videoUnsent?: boolean;
	staleFrames?: boolean;
	staleVideo?: boolean;
	wait?: "queued" | "running";
};

export type ScroSeedMessage = {
	type: "scro-seed-videos";
	videoId: string;
	aspectRatio?: "9:16" | "16:9" | "1:1";
	clips: ScroVideoSeedClip[];
	/** Create or recreate: drop the main-track cut and place the storyboard. */
	replace?: boolean;
};

export type ScroClipUpdatedMessage = {
	type: "scro-clip-updated";
	videoId: string;
	clip: ScroVideoSeedClip;
};

export type ScroVideosStateMessage = {
	type: "scro-videos-state";
	videoId: string;
	clips: ScroVideoSeedClip[];
};

/** Editor → host: run a production action for one clip. */
export type ScroClipActionMessage = {
	type: "scro-clip-action";
	videoId: string;
	clipNumber: number;
	action: "generate-frames" | "generate-video" | "cancel-video";
};

/** Editor → host: open FrameEdit on the page shell. */
export type ScroOpenAiMessage = {
	type: "scro-open-ai";
	videoId: string;
	clipNumber: number;
	kind: "scene-chat" | "frame-edit";
	position?: FramePosition;
};

/** Editor → host: rewrite this clip from one instruction, without a chat transcript. */
export type ScroSceneEditMessage = {
	type: "scro-scene-edit";
	videoId: string;
	clipNumber: number;
	message: string;
	requestId: string;
};

export type ScroSceneEditResultMessage = {
	type: "scro-scene-edit-result";
	videoId: string;
	clipNumber: number;
	requestId: string;
	ok: boolean;
	error?: string;
};

/** Editor → host: Assets selection for bulk / delete chrome. */
export type ScroSelectionStateMessage = {
	type: "scro-selection-state";
	videoId: string;
	selectedClipNumber: number | null;
	checkedClipNumbers: number[];
};
