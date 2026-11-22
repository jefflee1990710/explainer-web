import type { VideoQualityTier } from "@/model/project";
import { addUsd, legacyCreditsToUsd, mulUsd, roundUsd4, toUsdUnits } from "@/service/billing/usd";
import {
  HAILUO_3_VIDEO_MODEL,
  HEYGEN_AVATAR_IV_VIDEO_MODEL,
  NANO_BANANA_2_1_IMAGE_MODEL,
  SEEDREAM_5_PRO_IMAGE_MODEL,
  openRouterImageUserUsd,
  openRouterVideoUserPerSecondUsd,
} from "@/service/openrouter/media-price";

// Canonical USD credit pricing per action ($0.0001 precision).
// OpenRouter provider price × 1.5. Seedream 5.0 Pro at 2K is the $0.09 high-resolution SKU.
export const IMAGE_COST_USD = openRouterImageUserUsd(SEEDREAM_5_PRO_IMAGE_MODEL, { resolution: "2k" });
export const FRAME_COST_USD = IMAGE_COST_USD;
export const FRAMES_COST_USD = mulUsd(FRAME_COST_USD, 2);
// A character blueprint board is two Seedream 5.0 Pro 2K images.
export const BLUEPRINT_COST_USD = mulUsd(IMAGE_COST_USD, 2);
// Subtitle plates are Seedream 5.0 Pro at 1K ($0.045 provider).
export const SUBTITLE_PLATE_COST_USD = openRouterImageUserUsd(SEEDREAM_5_PRO_IMAGE_MODEL, {
  resolution: "1k",
});
// Diagram explainer stills are Nano Banana 2.1 at 1K (1120 output tokens × $0.00003).
export const EXPLAINER_STILL_COST_USD = openRouterImageUserUsd(NANO_BANANA_2_1_IMAGE_MODEL, {
  resolution: "1k",
});

// Standard video (minimax/hailuo-3 at $0.13/s, ComfyUI ref2va, Extend; voice included). 5-15 billed seconds.
export const VIDEO_COST_PER_SECOND_USD = openRouterVideoUserPerSecondUsd(HAILUO_3_VIDEO_MODEL, "2K");
export const MIN_VIDEO_SECONDS = 5;
export const MAX_VIDEO_SECONDS = 15;
// OpenRouter `minimax/hailuo-3` clamps a clip to 15s, so one-take bills `MAX_VIDEO_SECONDS`.
export const ONE_TAKE_MAX_VIDEO_SECONDS = 60;
export const TALKING_HEAD_MAX_VIDEO_SECONDS = 120;
// Sitting talking-head (heygen/avatar-iv at $0.05/s; voice included) up to 120s.
export const TALKING_HEAD_COST_PER_SECOND_USD = openRouterVideoUserPerSecondUsd(
  HEYGEN_AVATAR_IV_VIDEO_MODEL,
);

const DIAGRAM_EXPLAINER_SKILLS = new Set([
  "cartoon-explainer-video-director",
  "paper-cutout-explainer-video-director",
  "papercraft-diorama-director",
]);

// One storyboard still. Diagram explainers draw Nano Banana 2.1; every other still is Seedream 2K.
export function stillCostUsd(skillSlug?: string): number {
  return DIAGRAM_EXPLAINER_SKILLS.has(skillSlug ?? "") ? EXPLAINER_STILL_COST_USD : FRAME_COST_USD;
}
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

// Standard non-talking-head clip cost in USD (5-15s, Hailuo 3 × 1.5).
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

// Sitting talking-head clip cost in USD: HeyGen Avatar IV × 1.5, up to 120s, voice included.
export function talkingHeadVideoCostUsd(seconds: number): number {
  return mulUsd(
    TALKING_HEAD_COST_PER_SECOND_USD,
    billedVideoSeconds(seconds, TALKING_HEAD_MAX_VIDEO_SECONDS),
  );
}

/**
 * USD credit cost for one Scro Swap job:
 * - Static image swap: Seedream 5.0 Pro 2K (`IMAGE_COST_USD`)
 * - Video / GIF swap (`2s..15s`): that still plus Hailuo 3 seconds (`VIDEO_COST_PER_SECOND_USD`).
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
 * Seedream 5.0 Pro 2K scene plate (`IMAGE_COST_USD`) plus Hailuo 3 seconds.
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
