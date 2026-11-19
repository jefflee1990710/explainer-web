import type { VideoQualityTier } from "@/model/project";
import { addUsd, legacyCreditsToUsd, mulUsd, roundUsd4, toUsdUnits } from "@/service/billing/usd";

// Canonical USD credit pricing per action ($0.0001 precision).
// Single image / scene frame / cover / lock / plate / repaint: $0.15.
export const IMAGE_COST_USD = 0.15;
export const FRAME_COST_USD = IMAGE_COST_USD;
export const FRAMES_COST_USD = mulUsd(FRAME_COST_USD, 2);
// A character blueprint board is two images: identity portrait + full-body standing ($0.30).
export const BLUEPRINT_COST_USD = mulUsd(IMAGE_COST_USD, 2);

// Standard video (minimax/hailuo-3, ComfyUI ref2va, Extend; voice included): $0.10/s, 5-15 billed seconds.
export const VIDEO_COST_PER_SECOND_USD = 0.1;
export const MIN_VIDEO_SECONDS = 5;
export const MAX_VIDEO_SECONDS = 15;
// OpenRouter `minimax/hailuo-3` clamps a clip to 15s, so one-take bills `MAX_VIDEO_SECONDS`.
export const ONE_TAKE_MAX_VIDEO_SECONDS = 60;
export const TALKING_HEAD_MAX_VIDEO_SECONDS = 120;
// Sitting talking-head (heygen/avatar-iv; voice included): $0.18/s up to 120s.
export const TALKING_HEAD_COST_PER_SECOND_USD = 0.18;
export const MIN_VIDEO_COST_USD = mulUsd(VIDEO_COST_PER_SECOND_USD, MIN_VIDEO_SECONDS);

// Seconds the provider renders (and we bill) for a clip of this length.
export function billedVideoSeconds(seconds: number, maxSeconds = MAX_VIDEO_SECONDS) {
  const rounded = Number.isFinite(seconds) ? Math.round(seconds) : MIN_VIDEO_SECONDS;
  return Math.min(maxSeconds, Math.max(MIN_VIDEO_SECONDS, rounded));
}

export function videoCostPerSecondUsd(styleId?: string, videoQualityTier?: VideoQualityTier) {
  void styleId;
  void videoQualityTier;
  return VIDEO_COST_PER_SECOND_USD;
}

// Standard non-talking-head clip cost in USD (5-15s minimum $0.50).
export function videoCostUsd(
  seconds: number,
  styleId?: string,
  voiceSwap = false,
  maxSeconds = MAX_VIDEO_SECONDS,
  videoQualityTier?: VideoQualityTier,
): number {
  void voiceSwap;
  const perSecond = videoCostPerSecondUsd(styleId, videoQualityTier);
  return mulUsd(perSecond, billedVideoSeconds(seconds, maxSeconds));
}

// Sitting talking-head clip cost in USD: flat $0.18/s up to 120s, voice included.
export function talkingHeadVideoCostUsd(seconds: number): number {
  return mulUsd(
    TALKING_HEAD_COST_PER_SECOND_USD,
    billedVideoSeconds(seconds, TALKING_HEAD_MAX_VIDEO_SECONDS),
  );
}

/**
 * USD credit cost for one Scro Swap job:
 * - Static image swap: `IMAGE_COST_USD` (`$0.15`)
 * - Video / GIF swap (`2s..15s`): `IMAGE_COST_USD` (`$0.15` for keyframe prepare) + `$0.10/s` (`VIDEO_COST_PER_SECOND_USD`).
 */
export function scroSwapCostUsd(input?: {
  durationSeconds?: number;
  mediaKind?: "video" | "gif" | "image";
}): number {
  if (input?.mediaKind === "image") return IMAGE_COST_USD;
  const raw = Number(input?.durationSeconds);
  const clamped =
    Number.isFinite(raw) && raw > 0
      ? Math.min(MAX_VIDEO_SECONDS, Math.max(2, Math.round(raw)))
      : 6;
  return addUsd(IMAGE_COST_USD, mulUsd(VIDEO_COST_PER_SECOND_USD, clamped));
}

/**
 * USD credit cost for one Teleport job (`2s..15s`):
 * `IMAGE_COST_USD` (`$0.15` for relocated keyframe prepare) + `$0.10/s` (`VIDEO_COST_PER_SECOND_USD`).
 */
export function teleportCostUsd(input?: { durationSeconds?: number }): number {
  const raw = Number(input?.durationSeconds);
  const clamped =
    Number.isFinite(raw) && raw > 0
      ? Math.min(MAX_VIDEO_SECONDS, Math.max(2, Math.round(raw)))
      : 6;
  return addUsd(IMAGE_COST_USD, mulUsd(VIDEO_COST_PER_SECOND_USD, clamped));
}

// Exact USD amount charged for a clip video attempt; falls back to legacy integer credits or duration estimate.
export function chargedClipUsd(clip?: {
  chargedUsd?: number;
  creditsCharged?: number;
  durationSeconds?: number;
}): number {
  if (typeof clip?.chargedUsd === "number" && Number.isFinite(clip.chargedUsd)) {
    return roundUsd4(clip.chargedUsd);
  }
  if (typeof clip?.creditsCharged === "number" && Number.isFinite(clip.creditsCharged)) {
    return legacyCreditsToUsd(clip.creditsCharged);
  }
  return videoCostUsd(clip?.durationSeconds ?? MIN_VIDEO_SECONDS);
}

// True when remaining USD credit cannot pay for the video (defaults to the shortest one).
export function needsVideoUpgradeUsd(creditUsd: number, costUsd = MIN_VIDEO_COST_USD): boolean {
  return toUsdUnits(creditUsd) < toUsdUnits(costUsd);
}
