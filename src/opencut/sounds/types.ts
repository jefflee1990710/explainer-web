export const SOUND_EFFECT_CATEGORIES = [
	{ id: "all", label: "All", query: "" },
	{ id: "whoosh", label: "Whoosh & Transitions", query: "whoosh transition swoosh" },
	{ id: "impacts", label: "Impacts & Hits", query: "impact hit boom thud" },
	{ id: "ui", label: "UI & Clicks", query: "ui click pop ding notification" },
	{ id: "foley", label: "Foley & Steps", query: "foley footsteps cloth rustle" },
	{ id: "ambience", label: "Ambience", query: "ambience room tone nature" },
	{ id: "cinematic", label: "Cinematic", query: "cinematic riser braam tension" },
	{ id: "cartoon", label: "Cartoon & Comedy", query: "cartoon boing pop slide whistle" },
] as const;

export type SoundEffectCategoryId = (typeof SOUND_EFFECT_CATEGORIES)[number]["id"];
export type SoundEffectSourceFilter = "all" | "elevenlabs" | "library";

export interface SoundEffect {
	id: string;
	name: string;
	description: string;
	url: string;
	previewUrl?: string;
	downloadUrl?: string;
	duration: number;
	filesize: number;
	type: string;
	channels: number;
	bitrate: number;
	bitdepth: number;
	samplerate: number;
	username: string;
	tags: string[];
	license: string;
	created: string;
	downloads: number;
	rating: number;
	ratingCount: number;
}

export interface SavedSound {
	id: string;
	name: string;
	username: string;
	previewUrl?: string;
	downloadUrl?: string;
	duration: number;
	tags: string[];
	license: string;
	savedAt: string; // iso date string
}

export interface SavedSoundsData {
	sounds: SavedSound[];
	lastModified: string;
}
