import type { FramePosition } from "@/model/project";

// Directors whose later clips open on the previous clip's finished still.
export const SURPRISE_INTERVIEW_SKILL_SLUG = "surprise-interview-director";
export const OUTFIT_REEL_SKILL_SLUG = "outfit-reel-director";
export const FOLLOW_SHOT_SKILL_SLUG = "follow-shot-director";

// Outfit reels cut to a new full-body angle each clip, so they draw a new start still.
// Surprise interviews also draw every start, so each clip can carry its own bottom subtitle.
const CHAIN_FROM_CLIP_2 = new Set([
  "talking-head-director",
  "full-body-talking-head-director",
  FOLLOW_SHOT_SKILL_SLUG,
]);

export function isSurpriseInterviewSkill(skillSlug?: string) {
  return skillSlug === SURPRISE_INTERVIEW_SKILL_SLUG;
}

export function isOutfitReelSkill(skillSlug?: string) {
  return skillSlug === OUTFIT_REEL_SKILL_SLUG;
}

export function isFollowShotSkill(skillSlug?: string) {
  return skillSlug === FOLLOW_SHOT_SKILL_SLUG;
}

// True when any clip after the opener reuses the previous end still.
export function chainsClipStarts(skillSlug?: string) {
  if (!skillSlug) return false;
  return CHAIN_FROM_CLIP_2.has(skillSlug);
}

// Start still is not drawn: production copies the previous clip's end file.
export function inheritsPreviousEnd(
  skillSlug: string | undefined,
  clipNumber: number,
  position: FramePosition,
) {
  if (position !== "start" || clipNumber < 2 || !skillSlug) return false;
  return CHAIN_FROM_CLIP_2.has(skillSlug);
}
