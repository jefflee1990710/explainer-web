import { ObjectId } from "mongodb";
import { characterLockFromCast } from "@/service/character/cast-prompt";
import type {
  ClipDirectorOverrides,
  PhaseAProposal,
  Project,
  StoryboardRow,
} from "@/model/project";

export type ClipContextSource = {
  skillId?: ObjectId | string;
  skillSlug?: string;
  styleId?: string;
  cast?: unknown[];
  products?: unknown[];
  language?: Project["language"];
  narrationEnabled?: boolean;
  voiceGender?: Project["voiceGender"];
  speechPace?: Project["speechPace"];
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: Project["sceneTextLanguage"];
  directorBackgroundId?: string;
  backgroundImageUrls?: string[];
  talkingHeadBackgroundId?: string;
  talkingHeadPoseId?: string;
  logoUrl?: string;
  phaseA?: {
    characterLock?: string;
    clips: Array<Partial<StoryboardRow> & { clipNumber: number }>;
  };
};

// Attach non-undefined per-clip director overrides onto a drafted StoryboardRow.
export function attachClipOverrides(
  row: StoryboardRow,
  overrides?: ClipDirectorOverrides,
): StoryboardRow {
  if (!overrides) return row;
  return {
    ...row,
    ...(overrides.skillId !== undefined ? { skillId: overrides.skillId } : {}),
    ...(overrides.skillSlug !== undefined ? { skillSlug: overrides.skillSlug } : {}),
    ...(overrides.styleId !== undefined ? { styleId: overrides.styleId } : {}),
    ...(overrides.cast !== undefined ? { cast: overrides.cast } : {}),
    ...(overrides.products !== undefined ? { products: overrides.products } : {}),
    ...(overrides.language !== undefined ? { language: overrides.language } : {}),
    ...(overrides.narrationEnabled !== undefined
      ? { narrationEnabled: overrides.narrationEnabled }
      : {}),
    ...(overrides.voiceGender !== undefined ? { voiceGender: overrides.voiceGender } : {}),
    ...(overrides.speechPace !== undefined ? { speechPace: overrides.speechPace } : {}),
    ...(overrides.sceneTextEnabled !== undefined
      ? { sceneTextEnabled: overrides.sceneTextEnabled }
      : {}),
    ...(overrides.sceneTextLanguage !== undefined
      ? { sceneTextLanguage: overrides.sceneTextLanguage }
      : {}),
    ...(overrides.directorBackgroundId !== undefined
      ? { directorBackgroundId: overrides.directorBackgroundId }
      : {}),
    ...(overrides.backgroundImageUrls !== undefined
      ? { backgroundImageUrls: overrides.backgroundImageUrls }
      : {}),
    ...(overrides.talkingHeadBackgroundId !== undefined
      ? { talkingHeadBackgroundId: overrides.talkingHeadBackgroundId }
      : {}),
    ...(overrides.talkingHeadPoseId !== undefined
      ? { talkingHeadPoseId: overrides.talkingHeadPoseId }
      : {}),
    ...(overrides.logoUrl !== undefined ? { logoUrl: overrides.logoUrl } : {}),
  };
}

function hasAnyClipOverride(row: Partial<StoryboardRow> | undefined): boolean {
  if (!row) return false;
  return (
    row.skillId !== undefined ||
    row.skillSlug !== undefined ||
    row.styleId !== undefined ||
    row.cast !== undefined ||
    row.products !== undefined ||
    row.language !== undefined ||
    row.narrationEnabled !== undefined ||
    row.voiceGender !== undefined ||
    row.speechPace !== undefined ||
    row.sceneTextEnabled !== undefined ||
    row.sceneTextLanguage !== undefined ||
    row.directorBackgroundId !== undefined ||
    row.backgroundImageUrls !== undefined ||
    row.talkingHeadBackgroundId !== undefined ||
    row.talkingHeadPoseId !== undefined ||
    row.logoUrl !== undefined
  );
}

// Return a shallow Project view whose top-level director/style/cast/voice fields
// reflect the clip's own overrides when present, falling back to the project defaults.
export function resolveClipProject<T extends ClipContextSource>(
  project: T,
  clipNumber: number,
): T {
  const row = project.phaseA?.clips.find((c) => c.clipNumber === clipNumber);
  if (!hasAnyClipOverride(row)) return project;

  const resolvedSkillId =
    row?.skillId !== undefined
      ? typeof project.skillId === "object" &&
        project.skillId instanceof ObjectId &&
        typeof row.skillId === "string" &&
        ObjectId.isValid(row.skillId)
        ? new ObjectId(row.skillId)
        : row.skillId
      : project.skillId;

  const hasCastOverride = Array.isArray(row?.cast);
  const nextCharacterLock =
    hasCastOverride && project.phaseA
      ? row!.cast!.length > 0
        ? characterLockFromCast(row!.cast as NonNullable<Project["cast"]>)
        : ""
      : project.phaseA?.characterLock;

  return {
    ...project,
    ...(resolvedSkillId !== undefined ? { skillId: resolvedSkillId } : {}),
    ...(row?.skillSlug !== undefined ? { skillSlug: row.skillSlug } : {}),
    ...(row?.styleId !== undefined ? { styleId: row.styleId } : {}),
    ...(hasCastOverride ? { cast: row!.cast } : {}),
    ...(Array.isArray(row?.products) ? { products: row.products } : {}),
    ...(row?.language !== undefined ? { language: row.language } : {}),
    ...(row?.narrationEnabled !== undefined ? { narrationEnabled: row.narrationEnabled } : {}),
    ...(row?.voiceGender !== undefined ? { voiceGender: row.voiceGender } : {}),
    ...(row?.speechPace !== undefined ? { speechPace: row.speechPace } : {}),
    ...(row?.sceneTextEnabled !== undefined ? { sceneTextEnabled: row.sceneTextEnabled } : {}),
    ...(row?.sceneTextLanguage !== undefined ? { sceneTextLanguage: row.sceneTextLanguage } : {}),
    ...(row?.directorBackgroundId !== undefined
      ? { directorBackgroundId: row.directorBackgroundId }
      : {}),
    ...(row?.backgroundImageUrls !== undefined
      ? { backgroundImageUrls: row.backgroundImageUrls }
      : {}),
    ...(row?.talkingHeadBackgroundId !== undefined
      ? { talkingHeadBackgroundId: row.talkingHeadBackgroundId }
      : {}),
    ...(row?.talkingHeadPoseId !== undefined ? { talkingHeadPoseId: row.talkingHeadPoseId } : {}),
    ...(row?.logoUrl !== undefined ? { logoUrl: row.logoUrl } : {}),
    ...(project.phaseA && nextCharacterLock !== project.phaseA.characterLock
      ? {
          phaseA: {
            ...(project.phaseA as PhaseAProposal),
            characterLock: nextCharacterLock ?? "",
          },
        }
      : {}),
  };
}

// True only when two clips share the same effective director skillSlug and visual styleId.
export function clipsShareContinuity(
  project: ClipContextSource,
  prevClipNumber: number,
  nextClipNumber: number,
): boolean {
  const prev = resolveClipProject(project, prevClipNumber);
  const next = resolveClipProject(project, nextClipNumber);
  return (prev.skillSlug || "") === (next.skillSlug || "") && (prev.styleId || "") === (next.styleId || "");
}
