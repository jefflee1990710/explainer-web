import type { FramePosition } from "@/model/project";
import { getDirectorBySlug } from "@/service/director/catalog";

// Directors whose later clips open on the previous clip's finished still.
export const SURPRISE_INTERVIEW_SKILL_SLUG = "surprise-interview-director";
export const OUTFIT_REEL_SKILL_SLUG = "outfit-reel-director";
export const OUTFIT_CHANGE_SKILL_SLUG = "outfit-change-director";
export const FOLLOW_SHOT_SKILL_SLUG = "follow-shot-director";

const CHAIN_FROM_CLIP_2 = new Set([
  "talking-head-director",
  "full-body-talking-head-director",
  FOLLOW_SHOT_SKILL_SLUG,
  SURPRISE_INTERVIEW_SKILL_SLUG,
]);

export function isSurpriseInterviewSkill(skillSlug?: string) {
  return skillSlug === SURPRISE_INTERVIEW_SKILL_SLUG;
}

export function isOutfitReelSkill(skillSlug?: string) {
  return skillSlug === OUTFIT_REEL_SKILL_SLUG;
}

export function isOutfitChangeSkill(skillSlug?: string) {
  return skillSlug === OUTFIT_CHANGE_SKILL_SLUG;
}

// Clothes come from clothing photos; face stays on the character blueprint.
export function isWardrobeBuildSkill(skillSlug?: string) {
  return isOutfitReelSkill(skillSlug) || isOutfitChangeSkill(skillSlug);
}

// No voiceover, no narrator lock, SFX only.
export function isSilentOutfitSkill(skillSlug?: string) {
  return isOutfitReelSkill(skillSlug) || isOutfitChangeSkill(skillSlug);
}

export function isFollowShotSkill(skillSlug?: string) {
  return skillSlug === FOLLOW_SHOT_SKILL_SLUG;
}

// Driven by `IDirector.behavior.chainsClipStarts`: true when any clip after the opener continues from the previous end pose.
export function chainsClipStarts(skillSlug?: string) {
  if (!skillSlug) return false;
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.chainsClipStarts;
  return CHAIN_FROM_CLIP_2.has(skillSlug);
}

// Start still is not drawn: production copies the previous clip's end file.
// Since non-talking-head directors are start-only (no end still is drawn) and
// talking-head draws its own starts, no director skips drawing its start still.
export function inheritsPreviousEnd(
  skillSlug: string | undefined,
  clipNumber: number,
  position: FramePosition,
) {
  void skillSlug;
  void clipNumber;
  void position;
  return false;
}
