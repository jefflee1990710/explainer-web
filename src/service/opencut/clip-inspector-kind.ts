import { isTalkingHeadSkill } from "@/service/director/talking-head";
import {
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-slugs";

export type ScroClipInspectorKind =
  | "scroswap"
  | "teleport"
  | "talking-head"
  | "explainer";

/** Resolve which Scene AI inspector mode applies to a clip based on its effective `skillSlug`. */
export function resolveClipInspectorKind(
  skillSlug?: string | null,
): ScroClipInspectorKind {
  const clean = skillSlug?.trim();
  if (clean === SCRO_SWAP_STANDALONE_SKILL_SLUG) return "scroswap";
  if (clean === TELEPORT_STANDALONE_SKILL_SLUG) return "teleport";
  if (isTalkingHeadSkill(clean)) return "talking-head";
  return "explainer";
}

/** True when a clip supports changing its visual style (`styleId`) in the OpenCut inspector. */
export function canChangeClipStyle(
  clip:
    | {
        stage?: string | null;
        inspectorKind?: ScroClipInspectorKind | null;
      }
    | null
    | undefined,
): boolean {
  if (!clip) return false;
  if (clip.inspectorKind === "scroswap" || clip.inspectorKind === "teleport") {
    return false;
  }
  if (clip.stage === "frames_generating" || clip.stage === "video_generating") {
    return false;
  }
  return true;
}

/** Pure helper: update `styleId` (and optional `cast` override) on one storyboard clip row. */
export function applyClipStyleToStoryboardClips<
  T extends { clipNumber: number; styleId?: string; cast?: unknown[] },
>(
  clips: readonly T[],
  clipNumber: number,
  styleId: string,
  castOverride?: unknown[],
): T[] {
  return clips.map((row) =>
    row.clipNumber === clipNumber
      ? {
          ...row,
          styleId,
          ...(castOverride !== undefined ? { cast: castOverride } : {}),
        }
      : row,
  );
}
