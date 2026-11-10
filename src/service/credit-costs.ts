import type { VideoQualityTier } from "@/model/project";

// Credits per action. Each image is 4; a clip's two frames are 8.
export const FRAME_COST = 4;
export const FRAMES_COST = 8;
// A character blueprint board is two images: identity portrait + full-body standing.
export const BLUEPRINT_COST = FRAME_COST * 2;

// Video is billed per second like the provider: 9 credits/s (Seedance 2.0 Fast), 5–15 billed seconds.
export const VIDEO_CREDITS_PER_SECOND = 9;
// Cinematic realistic uses Seedance 2.0 at 720p (~$0.151/s vs $0.091/s for Fast = 15 : 9 ratio).
export const CINEMATIC_VIDEO_CREDITS_PER_SECOND = 15;
// Economy self-hosted Vast.ai ref2va + latent first/last frames bills 4 credits/s (voice included).
export const ECONOMY_VIDEO_CREDITS_PER_SECOND = 4;
// ElevenLabs voice changer on a clip whose character has a demo voice.
export const VOICE_SWAP_CREDITS_PER_SECOND = 1;
export const MIN_VIDEO_SECONDS = 5;
export const MAX_VIDEO_SECONDS = 15;
export const ONE_TAKE_MAX_VIDEO_SECONDS = 60;
export const TALKING_HEAD_MAX_VIDEO_SECONDS = 120;
// HeyGen Avatar IV costs $0.05/s. 4 credits/s is about a 70% gross margin
// at the Studio list price ($249 / 5,938 credits ≈ $0.042 per credit).
// The ElevenLabs track is the video's own audio, so voice is included.
export const TALKING_HEAD_CREDITS_PER_SECOND = 4;
export const MIN_VIDEO_COST = VIDEO_CREDITS_PER_SECOND * MIN_VIDEO_SECONDS;

// Seconds the provider renders (and we bill) for a clip of this length.
export function billedVideoSeconds(seconds: number, maxSeconds = MAX_VIDEO_SECONDS) {
  const rounded = Number.isFinite(seconds) ? Math.round(seconds) : MIN_VIDEO_SECONDS;
  return Math.min(maxSeconds, Math.max(MIN_VIDEO_SECONDS, rounded));
}

export function videoCreditsPerSecond(styleId?: string, videoQualityTier?: VideoQualityTier) {
  if (videoQualityTier === "economy") return ECONOMY_VIDEO_CREDITS_PER_SECOND;
  return styleId === "realistic" ? CINEMATIC_VIDEO_CREDITS_PER_SECOND : VIDEO_CREDITS_PER_SECOND;
}

export function videoCost(
  seconds: number,
  styleId?: string,
  voiceSwap = false,
  maxSeconds = MAX_VIDEO_SECONDS,
  videoQualityTier?: VideoQualityTier,
) {
  if (videoQualityTier === "economy") {
    return ECONOMY_VIDEO_CREDITS_PER_SECOND * billedVideoSeconds(seconds, maxSeconds);
  }
  const perSecond = videoCreditsPerSecond(styleId, videoQualityTier) + (voiceSwap ? VOICE_SWAP_CREDITS_PER_SECOND : 0);
  return perSecond * billedVideoSeconds(seconds, maxSeconds);
}

// Sitting talking-head only. Flat rate up to 120s, with no style or voice surcharge.
export function talkingHeadVideoCost(seconds: number) {
  return TALKING_HEAD_CREDITS_PER_SECOND * billedVideoSeconds(seconds, TALKING_HEAD_MAX_VIDEO_SECONDS);
}

/**
 * Credits for one Scro Swap job:
 * - Static image swap: `FRAME_COST` (`4` credits)
 * - Video / GIF swap (`2s..15s`): `FRAME_COST` (`4` credits for keyframe prepare) + `15 credits/s` (`CINEMATIC_VIDEO_CREDITS_PER_SECOND`).
 */
export function scroSwapCost(input?: {
  durationSeconds?: number;
  mediaKind?: "video" | "gif" | "image";
}): number {
  if (input?.mediaKind === "image") return FRAME_COST;
  const raw = Number(input?.durationSeconds);
  const clamped = Number.isFinite(raw) && raw > 0 ? Math.min(MAX_VIDEO_SECONDS, Math.max(2, Math.round(raw))) : 6;
  return FRAME_COST + CINEMATIC_VIDEO_CREDITS_PER_SECOND * clamped;
}

/**
 * Credits for one Teleport job (`2s..15s`):
 * `FRAME_COST` (`4` credits for relocated keyframe prepare) + `15 credits/s` (`CINEMATIC_VIDEO_CREDITS_PER_SECOND`).
 */
export function teleportCost(input?: { durationSeconds?: number }): number {
  const raw = Number(input?.durationSeconds);
  const clamped = Number.isFinite(raw) && raw > 0 ? Math.min(MAX_VIDEO_SECONDS, Math.max(2, Math.round(raw))) : 6;
  return FRAME_COST + CINEMATIC_VIDEO_CREDITS_PER_SECOND * clamped;
}

// What a clip video attempt was charged. Older clips predate `creditsCharged`.
export function chargedVideoCredits(clip?: { creditsCharged?: number; durationSeconds?: number }) {
  return clip?.creditsCharged ?? videoCost(clip?.durationSeconds ?? MIN_VIDEO_SECONDS);
}

// True when the wallet cannot pay for the video (defaults to the shortest one).
export function needsVideoUpgrade(credits: number, cost = MIN_VIDEO_COST) {
  return credits < cost;
}
