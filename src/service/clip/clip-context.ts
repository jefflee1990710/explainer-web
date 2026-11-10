import type { ObjectId } from "mongodb";
import { isStyleId, normalizeStyleId } from "@/model/style-id";
import { characterLockFromCast } from "@/service/character/cast-prompt";
import type {
  ClipDirectorOverrides,
  PhaseAProposal,
  Project,
  StoryboardRow,
} from "@/model/project";

const HEX_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function isValidClipStyleId(id: string | undefined): id is string {
  return Boolean(id && (isStyleId(id) || HEX_OBJECT_ID.test(id)));
}

function isObjectIdInstance(value: unknown): value is ObjectId {
  return (
    typeof value === "object" &&
    value !== null &&
    ("_bsontype" in value || typeof (value as { toHexString?: unknown }).toHexString === "function")
  );
}

// Reconstruct an ObjectId-like instance via the base ObjectId's constructor so this module
// remains 100% browser-safe (never pulling the Node `mongodb` driver into client bundles).
function coerceSkillId(
  baseSkillId: ObjectId | string | undefined,
  overrideSkillId: ObjectId | string,
): ObjectId | string {
  if (
    isObjectIdInstance(baseSkillId) &&
    typeof overrideSkillId === "string" &&
    HEX_OBJECT_ID.test(overrideSkillId)
  ) {
    const Ctor = baseSkillId.constructor as new (id: string) => ObjectId;
    return new Ctor(overrideSkillId);
  }
  return overrideSkillId;
}

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
  videoQualityTier?: Project["videoQualityTier"];
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
    ...(overrides.styleId !== undefined ? { styleId: normalizeStyleId(overrides.styleId) } : {}),
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
    ...(overrides.videoQualityTier !== undefined
      ? { videoQualityTier: overrides.videoQualityTier }
      : {}),
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
    row.logoUrl !== undefined ||
    row.videoQualityTier !== undefined
  );
}

const BASE_PROJECT = Symbol.for("scro.baseClipProject");

// Return a shallow Project view whose top-level director/style/cast/voice fields
// reflect the clip's own overrides when present, falling back to the project defaults.
export function resolveClipProject<T extends ClipContextSource>(
  project: T,
  clipNumber: number,
): T {
  const base = (project as Record<symbol, T>)[BASE_PROJECT] ?? project;
  const row = base.phaseA?.clips.find((c) => c.clipNumber === clipNumber);
  if (!hasAnyClipOverride(row)) return base;

  const resolvedSkillId =
    row?.skillId !== undefined
      ? coerceSkillId(base.skillId, row.skillId)
      : base.skillId;

  const hasCastOverride = Array.isArray(row?.cast);
  const nextCharacterLock =
    hasCastOverride && base.phaseA
      ? row!.cast!.length > 0
        ? characterLockFromCast(row!.cast as NonNullable<Project["cast"]>)
        : ""
      : base.phaseA?.characterLock;

  const normalizedProjectStyleId = normalizeStyleId(base.styleId);
  const normalizedRowStyleId = normalizeStyleId(row?.styleId);

  const resolved: T = {
    ...base,
    ...(normalizedProjectStyleId !== undefined ? { styleId: normalizedProjectStyleId } : {}),
    ...(resolvedSkillId !== undefined ? { skillId: resolvedSkillId } : {}),
    ...(row?.skillSlug !== undefined ? { skillSlug: row.skillSlug } : {}),
    ...(isValidClipStyleId(normalizedRowStyleId) ? { styleId: normalizedRowStyleId } : {}),
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
    ...(row?.videoQualityTier !== undefined ? { videoQualityTier: row.videoQualityTier } : {}),
    ...(base.phaseA && nextCharacterLock !== base.phaseA.characterLock
      ? {
          phaseA: {
            ...(base.phaseA as PhaseAProposal),
            characterLock: nextCharacterLock ?? "",
          },
        }
      : {}),
  };
  Object.defineProperty(resolved, BASE_PROJECT, {
    value: base,
    enumerable: false,
    configurable: true,
  });
  return resolved;
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
