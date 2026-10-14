import type { ScroVideoUiStage } from "@/service/scro-video/view-model";
import type { FramePosition } from "@/model/project";

export type { ScroVideoUiStage };

/** Seed / Assets / Properties row for one storyboard clip. */
export type ScroVideoSeedClip = {
	clipNumber: number;
	durationSeconds: number;
	stage: ScroVideoUiStage;
	posterUrl?: string;
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

/** Editor → host: open SceneChat or FrameEdit on the page shell. */
export type ScroOpenAiMessage = {
	type: "scro-open-ai";
	videoId: string;
	clipNumber: number;
	kind: "scene-chat" | "frame-edit";
	position?: FramePosition;
};
