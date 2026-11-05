import type { SoundEffectCategoryId } from "@/opencut/sounds/types";

export type IgViralSfxPreset = {
	slug: string;
	name: string;
	category: Exclude<SoundEffectCategoryId, "all">;
	prompt: string;
	durationSeconds: number;
	keywords: string[];
};

export const IG_VIRAL_SFX_PRESETS: readonly IgViralSfxPreset[] = [
	{
		slug: "ig-whip-whoosh",
		name: "IG Fast Whip Whoosh",
		category: "whoosh",
		prompt:
			"Clean fast cinematic whip pan whoosh transition sound effect, tight airy swoosh for short-form video cut, studio quality, no reverb tail",
		durationSeconds: 0.8,
		keywords: ["whoosh", "swoosh", "whip", "wipe", "slide", "transition", "fast"],
	},
	{
		slug: "ig-deep-swoosh",
		name: "IG Deep Airy Swoosh",
		category: "whoosh",
		prompt:
			"Smooth deep airy low-end cinematic swoosh transition sound effect, warm studio whoosh",
		durationSeconds: 1.0,
		keywords: ["soft", "cinematic", "deep", "dip", "dissolve", "smooth"],
	},
	{
		slug: "ig-zoom-whoosh",
		name: "IG Zoom Punch Whoosh",
		category: "whoosh",
		prompt:
			"Quick camera zoom in whoosh with subtle punchy low thump for viral video hook",
		durationSeconds: 0.8,
		keywords: ["zoom", "punch", "push", "in"],
	},
	{
		slug: "ig-bubble-pop",
		name: "IG Text Bubble Pop",
		category: "ui",
		prompt:
			"Crisp clean soft mouth bubble pop sound effect for social media text caption pop-up, dry studio recording",
		durationSeconds: 0.6,
		keywords: ["pop", "bubble", "text", "caption", "sticker", "card"],
	},
	{
		slug: "ig-glass-ding",
		name: "IG Subtle Glass Ding",
		category: "ui",
		prompt:
			"Clean modern subtle high-pitched glass notification ding chime for viral video highlight",
		durationSeconds: 0.9,
		keywords: ["ding", "bell", "notification", "chime", "subtle", "ui"],
	},
	{
		slug: "ig-camera-shutter",
		name: "IG Camera Shutter Flash",
		category: "ui",
		prompt:
			"Crisp modern mirrorless camera shutter click with subtle flash capacitor whine",
		durationSeconds: 0.8,
		keywords: ["camera", "shutter", "flash", "photo", "click", "snapshot"],
	},
	{
		slug: "ig-bass-drop",
		name: "IG Sub Bass Drop Impact",
		category: "impacts",
		prompt:
			"Clean tight cinematic sub bass boom impact drop for short video hook reveal",
		durationSeconds: 1.4,
		keywords: ["bass", "drop", "boom", "impact", "hit", "thud", "sub"],
	},
	{
		slug: "ig-cinematic-riser",
		name: "IG Short Tension Riser",
		category: "cinematic",
		prompt:
			"Short sleek cinematic airy riser swell building tension and cutting off cleanly",
		durationSeconds: 1.4,
		keywords: ["riser", "swell", "tension", "build", "cinematic"],
	},
	{
		slug: "ig-cash-ching",
		name: "IG Cash Register Cha-Ching",
		category: "ui",
		prompt:
			"Crisp modern cash register cha-ching coin bell sound effect, clean studio foley",
		durationSeconds: 1.1,
		keywords: ["cash", "money", "coin", "register", "ching", "profit", "sales"],
	},
	{
		slug: "ig-keyboard-typing",
		name: "IG Mechanical Keyboard Typing",
		category: "foley",
		prompt:
			"Crisp tactile custom mechanical keyboard rapid typing keystrokes, clean close-mic studio foley",
		durationSeconds: 1.4,
		keywords: ["keyboard", "typing", "type", "keystrokes", "computer", "code"],
	},
	{
		slug: "ig-page-flip",
		name: "IG Crisp Page Flip",
		category: "foley",
		prompt:
			"Crisp fast paper page turn flip sound effect, close-mic studio foley",
		durationSeconds: 0.7,
		keywords: ["page", "paper", "flip", "turn", "book", "document"],
	},
	{
		slug: "ig-finger-snap",
		name: "IG Studio Finger Snap",
		category: "foley",
		prompt:
			"Crisp single human finger snap click with tight studio presence, no background noise",
		durationSeconds: 0.7,
		keywords: ["finger", "snap", "snaps", "clap"],
	},
] as const;

/**
 * Match a search query and optional category to the closest curated IG Reels viral SFX preset.
 */
export function matchIgViralSfxPreset(
	query: string,
	category?: SoundEffectCategoryId,
): IgViralSfxPreset | null {
	const tokens = query
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((w) => w.length >= 2);
	if (tokens.length === 0) return null;

	let best: IgViralSfxPreset | null = null;
	let bestScore = 0;

	for (const preset of IG_VIRAL_SFX_PRESETS) {
		let score = 0;
		for (const token of tokens) {
			if (preset.keywords.includes(token)) {
				score += 3;
			} else if (preset.prompt.toLowerCase().includes(token)) {
				score += 1;
			}
		}
		if (category && category !== "all" && preset.category === category) {
			score += 2;
		}
		if (score > bestScore) {
			bestScore = score;
			best = preset;
		}
	}

	return bestScore >= 3 ? best : null;
}
