import type { ScroVideoUiStage } from "@/service/scro-video/view-model";

export type { ScroVideoUiStage };

export type ScroVideoSeedClip = {
	clipNumber: number;
	durationSeconds: number;
	stage: ScroVideoUiStage;
	posterUrl?: string;
	videoUrl?: string;
	name: string;
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
