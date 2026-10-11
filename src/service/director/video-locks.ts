import { generateText, Output } from "ai";
import { z } from "zod";
import type {
  BackgroundPlate,
  ObjectSheetItem,
  StoryboardRow,
  VoLanguage,
} from "@/model/project";
import { clipEndScene, clipStartScene } from "@/service/director/dual-beat";
import { sceneDescriptionLanguageLock } from "@/service/director/languages";
import { directorModel } from "@/service/director/model";
import { isTalkingHeadSkill } from "@/service/director/talking-head";

const MAX_OBJECTS = 16;
const MAX_SETS = 4;

const videoLocksSchema = z.object({
  objects: z.array(
    z.object({
      name: z.string(),
      notes: z.string(),
    }),
  ),
  sets: z.array(
    z.object({
      setId: z.string(),
      name: z.string(),
      notes: z.string(),
      clipNumbers: z.array(z.number().int().min(1)),
    }),
  ),
});

export type VideoLocksPlan = {
  objects: ObjectSheetItem[];
  sets: Array<Omit<BackgroundPlate, "url">>;
};

export function shouldPlanVideoLocks(skillSlug?: string) {
  return !isTalkingHeadSkill(skillSlug);
}

export function videoLocksSystem(language?: VoLanguage) {
  return [
    "You list the invented props and unique locations for one explainer video.",
    "objects: every distinct prop the stills name — tools, cups, dials, boards, easels, whiteboards, charts, furniture, handheld items.",
    "A board, a whiteboard, and an easel are separate if the scenes name them separately. Call a writing surface Whiteboard when the scene writes on a board, chart, or easel.",
    "Object notes describe shape, materials, and colours. Do not describe screen content or lettering that only one side can see.",
    "Do not list characters, brand products already locked elsewhere, locations, sky, buildings, or subtitle lettering.",
    `List every named prop. At most ${MAX_OBJECTS} objects after merging true duplicates. Empty array only if the stills name none.`,
    "sets: unique places from the Set lines. Same room or rooftop across clips shares one setId.",
    `At most ${MAX_SETS} sets. Merge near-duplicates. Every clipNumber appears in exactly one set.`,
    "setId is a short slug like rooftop or desk. notes describe empty architecture, light, and sky — no people, no handheld props.",
    "name and notes stay short. " + sceneDescriptionLanguageLock(language),
  ].join(" ");
}

export function videoLocksPrompt(clips: StoryboardRow[]) {
  return clips
    .map((clip) =>
      [
        `Clip ${clip.clipNumber}`,
        `startScene:\n${clipStartScene(clip)}`,
        `endScene:\n${clipEndScene(clip)}`,
        `motionCamera:\n${clip.motionCamera.trim()}`,
      ].join("\n"),
    )
    .join("\n\n");
}

export function normalizeVideoLocks(
  clips: StoryboardRow[],
  raw: z.infer<typeof videoLocksSchema>,
): VideoLocksPlan {
  const clipNumbers = clips.map((clip) => clip.clipNumber);
  const objects = fillMissingSceneProps(
    clips,
    raw.objects
      .map((item) => ({ name: item.name.trim(), notes: item.notes.trim() }))
      .filter((item) => item.name)
      .slice(0, MAX_OBJECTS),
  );

  const sets: VideoLocksPlan["sets"] = [];
  const used = new Set<number>();
  for (const set of raw.sets.slice(0, MAX_SETS)) {
    const setId = set.setId.trim().replace(/\s+/g, "-").toLowerCase() || `set-${sets.length + 1}`;
    const assigned = [...new Set(set.clipNumbers.filter((n) => clipNumbers.includes(n) && !used.has(n)))];
    if (!set.name.trim() || assigned.length === 0) continue;
    assigned.forEach((n) => used.add(n));
    sets.push({
      setId,
      name: set.name.trim(),
      notes: set.notes.trim(),
      clipNumbers: assigned,
    });
  }

  // Any clip the model skipped lands on the first set, or gets a leftover shared set.
  const missing = clipNumbers.filter((n) => !used.has(n));
  if (missing.length > 0) {
    if (sets.length > 0) {
      sets[0] = {
        ...sets[0],
        clipNumbers: [...sets[0].clipNumbers, ...missing],
      };
    } else {
      sets.push({
        setId: "shared",
        name: "shared set",
        notes: "Same place and light as the storyboard Set lines.",
        clipNumbers: missing,
      });
    }
  }

  return { objects, sets: sets.slice(0, MAX_SETS) };
}

// Scenes name a writing surface as board / easel / chart; the sheet must list Whiteboard.
const WRITING_SURFACE = /whiteboard|白板|\beasel\b|畫架|(?<![A-Za-z])board\b|\bchart\b/i;
const NAMED_AS_WHITEBOARD = /whiteboard|白板/i;
const NAMED_AS_SURFACE = /easel|chart|(?<![A-Za-z])board\b/i;
const NAMED_AS_MARKER = /marker|麥克筆/i;

export function fillMissingSceneProps(clips: StoryboardRow[], objects: ObjectSheetItem[]): ObjectSheetItem[] {
  const text = clips
    .map((clip) => [clipStartScene(clip), clipEndScene(clip), clip.motionCamera].join("\n"))
    .join("\n");
  const next = objects.map((item) => ({ ...item }));
  const has = (pattern: RegExp) => next.some((item) => pattern.test(item.name));

  if (WRITING_SURFACE.test(text) && !has(NAMED_AS_WHITEBOARD)) {
    const existing = next.find((item) => NAMED_AS_SURFACE.test(item.name));
    if (existing) existing.name = "Whiteboard";
    else next.push({ name: "Whiteboard", notes: "Writing surface named in the scenes." });
  }
  if (NAMED_AS_MARKER.test(text) && !has(NAMED_AS_MARKER)) {
    next.push({ name: "Marker", notes: "Handheld marker named in the scenes." });
  }
  return next;
}

// Write set ids onto each clip so frame prompts can find the plate.
export function applyVideoLocksToClips(clips: StoryboardRow[], sets: VideoLocksPlan["sets"]): StoryboardRow[] {
  const byClip = new Map<number, string>();
  for (const set of sets) {
    for (const clipNumber of set.clipNumbers) byClip.set(clipNumber, set.setId);
  }
  return clips.map((clip) => {
    const backgroundSetId = byClip.get(clip.clipNumber);
    if (!backgroundSetId) {
      const next = { ...clip };
      delete next.backgroundSetId;
      return next;
    }
    return { ...clip, backgroundSetId };
  });
}

// Fingerprint of inventoried props/places so an edit can tell the locks are stale.
export function videoLocksFingerprint(input: {
  objects?: ObjectSheetItem[];
  sets?: Array<Pick<BackgroundPlate, "setId" | "name" | "notes" | "clipNumbers">>;
}) {
  const objects = (input.objects || [])
    .map((item) => `${item.name}|${item.notes}`)
    .sort()
    .join(";");
  const sets = (input.sets || [])
    .map((set) => `${set.setId}|${set.name}|${set.notes}|${[...set.clipNumbers].sort().join(",")}`)
    .sort()
    .join(";");
  return `${objects}#${sets}`;
}

type VideoLocksGenerate = (input: {
  system: string;
  prompt: string;
}) => Promise<z.infer<typeof videoLocksSchema> | undefined>;

async function generateVideoLocks(input: { system: string; prompt: string }) {
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: videoLocksSchema }),
    system: input.system,
    prompt: input.prompt,
  });
  return output ?? undefined;
}

// One Flash call after the storyboard lands. Talking-head and failures return empty locks.
export async function planVideoLocks(
  input: { clips: StoryboardRow[]; language?: VoLanguage; skillSlug?: string },
  generate: VideoLocksGenerate = generateVideoLocks,
): Promise<VideoLocksPlan> {
  if (!shouldPlanVideoLocks(input.skillSlug) || input.clips.length === 0) {
    return { objects: [], sets: [] };
  }
  try {
    const output = await generate({
      system: videoLocksSystem(input.language),
      prompt: videoLocksPrompt(input.clips),
    });
    if (!output) return { objects: [], sets: [] };
    return normalizeVideoLocks(input.clips, output);
  } catch (error) {
    console.error("video locks plan failed", error);
    return { objects: [], sets: [] };
  }
}
