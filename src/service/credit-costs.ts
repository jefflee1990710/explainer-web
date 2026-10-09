// Credits per action. Each image is 4; a clip's two frames are 8.
export const FRAME_COST = 4;
export const FRAMES_COST = 8;
// A character blueprint board is two images: identity portrait + full-body standing.
export const BLUEPRINT_COST = FRAME_COST * 2;

// Video is billed per second like the provider: 9 credits/s, 5–15 billed seconds.
export const VIDEO_CREDITS_PER_SECOND = 9;
// Seedance 2.0 at 1080p is about $0.68/s (1920×1080×24/1024 tokens × $0.014/1k).
// MiniMax H3 is $0.13/s for 9 credits, so the same credit value is 47 credits/s.
export const CINEMATIC_VIDEO_CREDITS_PER_SECOND = 47;
export const MIN_VIDEO_SECONDS = 5;
export const MAX_VIDEO_SECONDS = 15;
export const MIN_VIDEO_COST = VIDEO_CREDITS_PER_SECOND * MIN_VIDEO_SECONDS;

// Seconds the provider renders (and we bill) for a clip of this length.
export function billedVideoSeconds(seconds: number) {
  const rounded = Number.isFinite(seconds) ? Math.round(seconds) : MIN_VIDEO_SECONDS;
  return Math.min(MAX_VIDEO_SECONDS, Math.max(MIN_VIDEO_SECONDS, rounded));
}

export function videoCreditsPerSecond(styleId?: string) {
  return styleId === "realistic" ? CINEMATIC_VIDEO_CREDITS_PER_SECOND : VIDEO_CREDITS_PER_SECOND;
}

export function videoCost(seconds: number, styleId?: string) {
  return videoCreditsPerSecond(styleId) * billedVideoSeconds(seconds);
}

// What a clip video attempt was charged. Older clips predate `creditsCharged`.
export function chargedVideoCredits(clip?: { creditsCharged?: number; durationSeconds?: number }) {
  return clip?.creditsCharged ?? videoCost(clip?.durationSeconds ?? MIN_VIDEO_SECONDS);
}

// True when the wallet cannot pay for the video (defaults to the shortest one).
export function needsVideoUpgrade(credits: number, cost = MIN_VIDEO_COST) {
  return credits < cost;
}
