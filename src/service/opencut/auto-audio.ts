// AI planners for OpenCut timeline Foley SFX + background music.
import { generateText, Output } from "ai";
import { z } from "zod";
import { directorModel } from "@/service/director/model";
import { searchFreesoundSounds } from "@/service/freesound/search";
import { listSoundEffects, type LibrarySound } from "@/service/sound-effect/library";

export type PlannedSfxInsertion = {
  clipNumber: number;
  query: string;
  reason: string;
  beat: "start" | "mid" | "end";
  sound: LibrarySound;
};

export type PlannedBgmSelection = {
  mood: string;
  englishSearchQuery: string;
  reason: string;
  sound: LibrarySound;
};

const sfxPlanSchema = z.object({
  insertions: z
    .array(
      z.object({
        clipNumber: z.number().int().positive(),
        englishSearchQuery: z.string().min(2).max(60),
        reason: z.string().min(1).max(120),
        beat: z.enum(["start", "mid", "end"]),
      }),
    )
    .max(8),
});

const bgmPlanSchema = z.object({
  mood: z.string().min(2).max(40),
  englishSearchQuery: z.string().min(2).max(80),
  reason: z.string().min(1).max(160),
});

/** Resolve when an SFX should start inside a clip window. */
export function computeSfxStartSeconds({
  clipStartSec,
  clipDurSec,
  beat,
}: {
  clipStartSec: number;
  clipDurSec: number;
  beat: "start" | "mid" | "end";
}) {
  if (beat === "start") return Math.round(clipStartSec * 100) / 100;
  if (beat === "end") {
    return Math.round(Math.max(clipStartSec, clipStartSec + clipDurSec - 0.45) * 100) / 100;
  }
  return Math.round((clipStartSec + clipDurSec * 0.42) * 100) / 100;
}

async function pickSoundForQuery(query: string): Promise<LibrarySound | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Prefer the Kenney vector library (fast, CC0, always on-disk).
  try {
    const library = await listSoundEffects({ page: 1, query: trimmed });
    if (library.results[0]) return library.results[0];
  } catch {
    // Fall through to Freesound.
  }

  try {
    const freesound = await searchFreesoundSounds({
      page: 1,
      query: trimmed,
      commercialOnly: true,
    });
    // Prefer short Foley for SFX.
    const short =
      freesound.results.find((sound) => sound.duration > 0 && sound.duration <= 4) ??
      freesound.results[0];
    return short ?? null;
  } catch {
    return null;
  }
}

async function pickBgmForQuery(query: string): Promise<LibrarySound | null> {
  const attempts = [
    `${query} ambient instrumental music`,
    `${query} background music loop`,
    "calm ambient instrumental music",
  ];
  for (const attempt of attempts) {
    try {
      const page = await searchFreesoundSounds({
        page: 1,
        query: attempt,
        commercialOnly: true,
        // Longer beds for underscore music.
        durationMinSec: 18,
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
 * Ask the director model which Foley hits to place, then resolve library/Freesound files.
 */
export async function planAutoSfxInsertions({
  clips,
}: {
  clips: Array<{ clipNumber: number; line: string }>;
}): Promise<PlannedSfxInsertion[]> {
  const validClips = clips.filter((clip) => clip.line.trim().length > 0);
  if (validClips.length === 0) return [];

  let planned: Array<{
    clipNumber: number;
    englishSearchQuery: string;
    reason: string;
    beat: "start" | "mid" | "end";
  }> = [];

  try {
    const generated = await generateText({
      model: directorModel(),
      output: Output.object({ schema: sfxPlanSchema }),
      system: `You are a short-form video sound designer adding subtle Foley / UI / whoosh SFX under spoken VO.
Given each clip's spoken line:
1. Pick at most ~40% of clips (never every clip). Prefer middle beats with a clear physical action, transition, or emphasis word.
2. Skip pure talking-head close-ups with no implied action when nothing sonic helps.
3. englishSearchQuery must be 2-5 concrete English Foley words (e.g. "soft whoosh transition", "keyboard typing", "camera shutter click", "coffee cup clink"). Never invent music beds here.`,
      prompt: validClips.map((clip) => `Clip ${clip.clipNumber}: ${clip.line}`).join("\n"),
    });
    if (generated.output?.insertions?.length) {
      planned = generated.output.insertions;
    }
  } catch {
    planned = validClips.slice(1, 4).map((clip) => ({
      clipNumber: clip.clipNumber,
      englishSearchQuery: "soft whoosh transition",
      reason: clip.line.slice(0, 40),
      beat: "mid" as const,
    }));
  }

  const usedIds = new Set<string>();
  const results: PlannedSfxInsertion[] = [];
  for (const item of planned) {
    const sound = await pickSoundForQuery(item.englishSearchQuery);
    if (!sound || usedIds.has(sound.id)) continue;
    usedIds.add(sound.id);
    results.push({
      clipNumber: item.clipNumber,
      query: item.englishSearchQuery,
      reason: item.reason,
      beat: item.beat,
      sound,
    });
  }
  return results;
}

/** Pick one underscore BGM bed from the VO mood. */
export async function planAutoBgmSelection({
  clips,
  title,
}: {
  clips: Array<{ clipNumber: number; line: string }>;
  title?: string;
}): Promise<PlannedBgmSelection | null> {
  const lines = clips.map((clip) => clip.line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let mood = "calm";
  let englishSearchQuery = "calm ambient instrumental";
  let reason = "Default underscore";

  try {
    const generated = await generateText({
      model: directorModel(),
      output: Output.object({ schema: bgmPlanSchema }),
      system: `You are picking ONE quiet instrumental background music bed for a short talking-head / explainer video.
Return a short mood word and a 3-6 word English Freesound search query for ambient / lo-fi / soft electronic / acoustic underscore.
Avoid lyrics, avoid aggressive trap/EDM, avoid horror. Prefer calm beds that sit under speech.`,
      prompt: [
        title ? `Title: ${title}` : "",
        ...lines.map((line, index) => `Clip ${index + 1}: ${line}`),
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

  const sound = await pickBgmForQuery(englishSearchQuery);
  if (!sound) return null;
  return { mood, englishSearchQuery, reason, sound };
}

export const AI_SFX_NAME_PREFIX = "SFX";
export const AI_BGM_NAME_PREFIX = "BGM";
/** Short Foley hits — a bit under speech (0 dB = unity). */
export const AI_SFX_VOLUME_DB = -6;
/** Underscore bed — sit well under VO. */
export const AI_BGM_VOLUME_DB = -18;

export function isAiSfxElementName(name: string) {
  return /^SFX\b/i.test(name.trim());
}

export function isAiBgmElementName(name: string) {
  return /^BGM\b/i.test(name.trim());
}
