// AI planners for OpenCut timeline Foley SFX + background music.
import { generateText, Output } from "ai";
import { z } from "zod";
import { directorModel } from "@/service/director/model";
import { searchFreesoundSounds } from "@/service/freesound/search";
import {
	createAndPersistElevenLabsSound,
	searchSavedElevenLabsSounds,
	type SoundEffectCategoryId,
} from "@/service/sound-effect/elevenlabs-sfx";
import { matchIgViralSfxPreset } from "@/service/sound-effect/ig-viral-sfx";
import type { LibrarySound } from "@/service/sound-effect/library-sound";
import {
	computeSfxStartSeconds,
	mapTimelineCuesToSfxCandidates,
	type PlannedBgmSelection,
	type PlannedSfxInsertion,
	type TimelineAudioClipInput,
	type TimelineTransitionCue,
	type TimelineVisualPopCue,
} from "@/service/opencut/auto-audio-shared";

export type {
	PlannedBgmSelection,
	PlannedSfxInsertion,
	TimelineAudioClipInput,
	TimelineTransitionCue,
	TimelineVisualPopCue,
} from "@/service/opencut/auto-audio-shared";
export {
	AI_BGM_DUCKED_VOLUME_DB,
	AI_BGM_NAME_PREFIX,
	AI_BGM_VOLUME_DB,
	AI_SFX_NAME_PREFIX,
	AI_SFX_VOLUME_DB,
	buildBgmAutoDuckingKeyframes,
	buildBgmSegmentsForTimeline,
	computeSfxStartSeconds,
	detectAudioPeakOffsetSeconds,
	isAiBgmElementName,
	isAiSfxElementName,
	mapTimelineCuesToSfxCandidates,
} from "@/service/opencut/auto-audio-shared";

const CATEGORY_ENUM = z.enum([
	"whoosh",
	"impacts",
	"ui",
	"foley",
	"ambience",
	"cinematic",
	"cartoon",
]);

const sfxPlanSchema = z.object({
	insertions: z
		.array(
			z.object({
				clipNumber: z.number().int().positive(),
				englishSearchQuery: z.string().min(2).max(60),
				category: CATEGORY_ENUM,
				reason: z.string().min(1).max(120),
				beat: z.enum(["start", "mid", "end"]),
				offsetRatio: z.number().min(0.05).max(0.92),
				preferAiFoley: z.boolean(),
			}),
		)
		.max(8),
});

const bgmPlanSchema = z.object({
	mood: z.string().min(2).max(40),
	englishSearchQuery: z.string().min(2).max(80),
	reason: z.string().min(1).max(160),
});

async function pickSoundForQuery(
	query: string,
	options?: {
		category?: SoundEffectCategoryId;
		allowAiGeneration?: boolean;
		excludeIds?: ReadonlySet<string>;
	},
): Promise<LibrarySound | null> {
	const trimmed = query.trim();
	if (!trimmed) return null;
	const exclude = options?.excludeIds;

	// 1. Match curated IG Reels Viral SFX preset first if applicable
	const viralPreset = matchIgViralSfxPreset(trimmed, options?.category);
	if (viralPreset && !exclude?.has(viralPreset.slug)) {
		try {
			const saved = await searchSavedElevenLabsSounds({
				query: viralPreset.name,
				category: viralPreset.category,
				limit: 5,
			});
			const exact =
				saved.find((s) => s.id === viralPreset.slug) ??
				saved.find((s) => !exclude?.has(s.id));
			if (exact) return exact;
		} catch {
			// Fall through
		}

		if (process.env.ELEVENLABS_API_KEY?.trim()) {
			try {
				const seeded = await createAndPersistElevenLabsSound({
					slug: viralPreset.slug,
					name: viralPreset.name,
					text: viralPreset.prompt,
					category: viralPreset.category,
					durationSeconds: viralPreset.durationSeconds,
					extraTags: viralPreset.keywords,
				});
				if (seeded) return seeded;
			} catch {
				// Fall through
			}
		}
	}

	// 2. Check saved ElevenLabs AI SFX in MongoDB by query/category
	try {
		const savedEl = await searchSavedElevenLabsSounds({
			query: trimmed,
			category: options?.category,
			limit: 6,
		});
		const match = savedEl.find((s) => !exclude?.has(s.id) && s.duration <= 5);
		if (match) return match;
	} catch {
		// Fall through
	}

	// 3. If specific physical Foley is requested and ELEVENLABS_API_KEY is available, generate & persist
	if (options?.allowAiGeneration && process.env.ELEVENLABS_API_KEY?.trim()) {
		try {
			const created = await createAndPersistElevenLabsSound({
				text: trimmed,
				category: options.category ?? "foley",
				durationSeconds: 1.4,
			});
			if (created && !exclude?.has(created.id)) return created;
		} catch {
			// Fall through to Freesound
		}
	}

	// 4. Fallback to Freesound commercial-safe short clips (never Kenney 8-bit game sounds)
	try {
		const freesound = await searchFreesoundSounds({
			page: 1,
			query: trimmed,
			commercialOnly: true,
		});
		const short =
			freesound.results.find(
				(sound) =>
					!exclude?.has(sound.id) && sound.duration >= 0.15 && sound.duration <= 3.8,
			) ?? freesound.results.find((sound) => !exclude?.has(sound.id));
		return short ?? null;
	} catch {
		return null;
	}
}

async function pickBgmForQuery(
	query: string,
	mood?: string,
): Promise<LibrarySound | null> {
	const attempts = [
		`${query} ambient instrumental music`,
		`${mood || query} background music loop`,
		"calm ambient lo-fi instrumental music",
	];
	for (const attempt of attempts) {
		try {
			const page = await searchFreesoundSounds({
				page: 1,
				query: attempt,
				commercialOnly: true,
				durationMinSec: 16,
				durationMaxSec: 240,
			});
			const hit =
				page.results.find((sound) => sound.duration >= 18) ?? page.results[0];
			if (hit) return hit;
		} catch {
			// try next query
		}
	}
	return null;
}

/**
 * Combine timeline structural cues (transitions, on-screen text, stickers, B-roll entrances)
 * with LLM-planned narrative/visual Foley hits, and resolve optimal audio assets.
 */
export async function planAutoSfxInsertions({
	clips,
	transitions = [],
	visualPops = [],
}: {
	clips: TimelineAudioClipInput[];
	transitions?: TimelineTransitionCue[];
	visualPops?: TimelineVisualPopCue[];
}): Promise<PlannedSfxInsertion[]> {
	const validClips = clips.filter(
		(clip) =>
			clip.line.trim().length > 0 || (clip.visualScene?.trim().length ?? 0) > 0,
	);
	if (validClips.length === 0 && transitions.length === 0 && visualPops.length === 0) {
		return [];
	}

	const usedIds = new Set<string>();
	const results: PlannedSfxInsertion[] = [];
	const occupiedTimesSec: number[] = [];

	// 1. Structural timeline cues (Transitions + On-screen Text / Sticker / B-Roll entrances)
	const structuralCues = mapTimelineCuesToSfxCandidates({
		transitions,
		visualPops,
	}).slice(0, 6);

	for (const cue of structuralCues) {
		const sound = await pickSoundForQuery(cue.query, {
			category: cue.category,
			allowAiGeneration: false,
			excludeIds: usedIds,
		});
		if (!sound) continue;
		usedIds.add(sound.id);
		occupiedTimesSec.push(cue.targetTimeSec);

		// Associate with the clip covering targetTimeSec, or fallback to clip 1
		const ownerClip =
			validClips.find(
				(c) =>
					typeof c.startSec === "number" &&
					typeof c.durationSec === "number" &&
					cue.targetTimeSec >= c.startSec - 0.5 &&
					cue.targetTimeSec <= c.startSec + c.durationSec + 0.5,
			) ?? validClips[0];

		results.push({
			clipNumber: ownerClip?.clipNumber ?? 1,
			query: cue.query,
			reason: cue.reason,
			beat: "start",
			category: cue.category,
			targetTimeSec: cue.targetTimeSec,
			sound,
		});
	}

	if (validClips.length === 0) {
		return results;
	}

	// 2. Narrative & Visual Action Foley cues planned by Gemini
	let planned: Array<{
		clipNumber: number;
		englishSearchQuery: string;
		category: SoundEffectCategoryId;
		reason: string;
		beat: "start" | "mid" | "end";
		offsetRatio: number;
		preferAiFoley: boolean;
	}> = [];

	try {
		const promptLines = validClips.map((clip) => {
			const parts = [`Clip ${clip.clipNumber}: VO="${clip.line.trim()}"`];
			if (clip.visualScene?.trim()) {
				parts.push(`Visual="${clip.visualScene.trim().slice(0, 140)}"`);
			}
			if (clip.motionCamera?.trim()) {
				parts.push(`Camera="${clip.motionCamera.trim().slice(0, 80)}"`);
			}
			return parts.join(" | ");
		});

		const generated = await generateText({
			model: directorModel(),
			output: Output.object({ schema: sfxPlanSchema }),
			system: `You are a viral Instagram Reels / TikTok sound designer adding crisp studio Foley, UI, impact, and transition SFX under spoken VO.
Given each clip's spoken VO line, visual scene action, and camera motion:
1. For any clip that has a concrete physical action (e.g. snapping fingers, typing on a keyboard, pouring coffee, turning a page, camera flash) or hook punch-in, include 1 SFX insertion for that clip. For longer 5+ clip timelines, pick ~60% of clips.
2. Set offsetRatio (0.08 to 0.88) to match the fractional position in the clip where the physical action occurs (e.g., 0.12 for an early finger snap, 0.45 for mid-clip typing, 0.80 for a closing gesture).
3. englishSearchQuery must be 2-5 concrete English sound words matching viral IG Reels SFX (e.g., "finger snap click", "mechanical keyboard typing", "camera shutter flash", "cash register cha-ching", "text bubble pop", "sub bass drop impact", "fast whip whoosh").
4. Set preferAiFoley=true when the sound is a physical Foley action.`,
			prompt: promptLines.join("\n"),
		});
		if (generated.output?.insertions?.length) {
			planned = generated.output.insertions;
		}
	} catch {
		planned = validClips.slice(0, 4).map((clip, idx) => {
			const combinedText = `${clip.visualScene ?? ""} ${clip.motionCamera ?? ""} ${clip.line}`;
			const matchedPreset = matchIgViralSfxPreset(combinedText);
			return {
				clipNumber: clip.clipNumber,
				englishSearchQuery:
					matchedPreset?.name ??
					(idx === 0 ? "finger snap pop" : "mechanical keyboard typing"),
				category: matchedPreset?.category ?? ("foley" as const),
				reason: (clip.visualScene || clip.line).slice(0, 40),
				beat: idx === 0 ? ("start" as const) : ("mid" as const),
				offsetRatio: idx === 0 ? 0.12 : 0.38,
				preferAiFoley: true,
			};
		});
	}

	let aiGenCount = 0;
	for (const item of planned) {
		const clipMeta = validClips.find((c) => c.clipNumber === item.clipNumber);
		let adjustedOffsetRatio = item.offsetRatio;
		if (
			clipMeta &&
			typeof clipMeta.startSec === "number" &&
			typeof clipMeta.durationSec === "number"
		) {
			let estSec = computeSfxStartSeconds({
				clipStartSec: clipMeta.startSec,
				clipDurSec: clipMeta.durationSec,
				beat: item.beat,
				offsetRatio: adjustedOffsetRatio,
			});
			// If an existing structural cue is within 0.35s, nudge the action SFX slightly so both are heard cleanly
			const colliding = occupiedTimesSec.find((t) => Math.abs(t - estSec) < 0.35);
			if (colliding !== undefined) {
				const nudgedSec =
					estSec <= colliding
						? Math.max(clipMeta.startSec + 0.25, colliding - 0.5)
						: Math.min(
								clipMeta.startSec + clipMeta.durationSec - 0.35,
								colliding + 0.5,
							);
				if (occupiedTimesSec.some((t) => Math.abs(t - nudgedSec) < 0.25)) {
					continue;
				}
				estSec = nudgedSec;
				adjustedOffsetRatio = Math.max(
					0.05,
					Math.min(0.92, (estSec - clipMeta.startSec) / clipMeta.durationSec),
				);
			}
			occupiedTimesSec.push(estSec);
		}

		const allowAiGeneration = item.preferAiFoley && aiGenCount < 2;
		const sound = await pickSoundForQuery(item.englishSearchQuery, {
			category: item.category,
			allowAiGeneration,
			excludeIds: usedIds,
		});
		if (!sound) continue;
		if (allowAiGeneration && sound.id.startsWith("el-sfx-")) {
			aiGenCount++;
		}
		usedIds.add(sound.id);
		results.push({
			clipNumber: item.clipNumber,
			query: item.englishSearchQuery,
			reason: item.reason,
			beat: item.beat,
			category: item.category,
			offsetRatio: adjustedOffsetRatio,
			sound,
		});
	}

	return results;
}

/** Pick one underscore BGM bed from the VO & visual mood. */
export async function planAutoBgmSelection({
	clips,
	title,
}: {
	clips: TimelineAudioClipInput[];
	title?: string;
}): Promise<PlannedBgmSelection | null> {
	const valid = clips.filter(
		(c) => c.line.trim().length > 0 || (c.visualScene?.trim().length ?? 0) > 0,
	);
	if (valid.length === 0) return null;

	let mood = "calm";
	let englishSearchQuery = "calm ambient instrumental";
	let reason = "Default underscore";

	try {
		const generated = await generateText({
			model: directorModel(),
			output: Output.object({ schema: bgmPlanSchema }),
			system: `You are picking ONE instrumental background music bed for a short-form explainer / talking-head video.
Analyze both the spoken lines and visual scene descriptions:
1. Return a concise mood label (e.g. "warm storytelling", "upbeat modern", "tech minimal", "cinematic focus", "lo-fi chill").
2. Return a 3-6 word English search query for a clean instrumental underscore loop (ambient / lo-fi / soft electronic / acoustic).
3. Avoid vocals/lyrics, avoid harsh distortion. Prefer beds that sit cleanly under spoken dialogue.`,
			prompt: [
				title ? `Title: ${title}` : "",
				...valid.map(
					(c) =>
						`Clip ${c.clipNumber}: ${c.line.trim()}${
							c.visualScene ? ` [Scene: ${c.visualScene.slice(0, 80)}]` : ""
						}`,
				),
			]
				.filter(Boolean)
				.join("\n"),
		});
		if (generated.output) {
			mood = generated.output.mood;
			englishSearchQuery = generated.output.englishSearchQuery;
			reason = generated.output.reason;
		}
	} catch {
		// keep defaults
	}

	const sound = await pickBgmForQuery(englishSearchQuery, mood);
	if (!sound) return null;
	return { mood, englishSearchQuery, reason, sound };
}
