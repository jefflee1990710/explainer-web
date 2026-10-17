// Credits per action. Each image is 4; a clip's two frames are 8.
export const FRAME_COST = 4;
export const FRAMES_COST = 8;
// A character blueprint board is two images: identity portrait + full-body standing.
export const BLUEPRINT_COST = FRAME_COST * 2;

// Video is billed per second like the provider: 9 credits/s (Seedance 2.0 Fast), 5–15 billed seconds.
export const VIDEO_CREDITS_PER_SECOND = 9;
// Cinematic realistic uses Seedance 2.0 at 720p (~$0.151/s vs $0.091/s for Fast = 15 : 9 ratio).
export const CINEMATIC_VIDEO_CREDITS_PER_SECOND = 15;
// ElevenLabs voice changer on a clip whose character has a demo voice.
export const VOICE_SWAP_CREDITS_PER_SECOND = 1;
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

export function videoCost(seconds: number, styleId?: string, voiceSwap = false) {
  const perSecond = videoCreditsPerSecond(styleId) + (voiceSwap ? VOICE_SWAP_CREDITS_PER_SECOND : 0);
  return perSecond * billedVideoSeconds(seconds);
}

// What a clip video attempt was charged. Older clips predate `creditsCharged`.
export function chargedVideoCredits(clip?: { creditsCharged?: number; durationSeconds?: number }) {
  return clip?.creditsCharged ?? videoCost(clip?.durationSeconds ?? MIN_VIDEO_SECONDS);
}

// True when the wallet cannot pay for the video (defaults to the shortest one).
export function needsVideoUpgrade(credits: number, cost = MIN_VIDEO_COST) {
  return credits < cost;
}
