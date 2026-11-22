// Server-authoritative USD credit pricing for Interactive Node Canvas models.
// Uses integer-scaled arithmetic from `src/service/billing/usd.ts` to avoid floating-point drift.

import { formatUsd, mulUsd, roundUsd4, addUsd } from "@/service/billing/usd";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import {
  IMAGE_COST_USD,
  MIN_VIDEO_SECONDS,
  billedVideoSeconds,
  scroSwapCostUsd,
  talkingHeadVideoCostUsd,
  teleportCostUsd,
  VIDEO_COST_PER_SECOND_USD,
  videoCostUsd,
} from "@/service/credit-costs";
import { OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL } from "@/service/openrouter/generate";

// Minimum USD charge per Mentalok execution ($0.005).
export const CANVAS_MIN_CHARGE_USD = 0.005;
export const DEFAULT_CANVAS_MENTALOK_MARKUP = 1.5;
export const CANVAS_HEYGEN_MAX_VIDEO_SECONDS = 60;
export const CANVAS_TTS_COST_USD = 0.02;

function explainerEstimateClips(durationSeconds: number): number {
  if (durationSeconds <= 15) return 3;
  if (durationSeconds <= 30) return 5;
  if (durationSeconds <= 45) return 7;
  return 9;
}

export function explainerEstimatedCostUsd(durationSeconds: number): number {
  const clamped = Math.min(60, Math.max(15, Math.round(durationSeconds || 30)));
  const clips = explainerEstimateClips(clamped);
  return addUsd(mulUsd(IMAGE_COST_USD, clips), mulUsd(0.1, clamped));
}

// Reads Mentalok pricing markup from `CANVAS_MENTALOK_MARKUP`, defaulting to 1.5x.
export function canvasMentalokMarkup(
  envValue: string | undefined = process.env.CANVAS_MENTALOK_MARKUP,
): number {
  if (typeof envValue !== "string" || !envValue.trim()) {
    return DEFAULT_CANVAS_MENTALOK_MARKUP;
  }
  const parsed = Number(envValue.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CANVAS_MENTALOK_MARKUP;
  }
  return parsed;
}

export type CanvasCostEstimateParams = {
  durationSeconds?: number;
  markup?: number;
};

// Computes exact 4-decimal USD cost for executing one canvas model node.
export function estimateCanvasModelCostUsd(
  spec: CanvasModelSpec,
  params?: CanvasCostEstimateParams,
): number {
  if (spec.provider === "ffmpeg") {
    return 0;
  }

  if (spec.provider === "scro") {
    const duration = params?.durationSeconds ?? spec.defaultDurationSeconds ?? MIN_VIDEO_SECONDS;
    switch (spec.id) {
      case "scro:tts":
        return CANVAS_TTS_COST_USD;
      case "scro:life":
      case "scro:poster":
      case "scro:explainer-frame":
        return IMAGE_COST_USD;
      case "scro:talking-head":
        return talkingHeadVideoCostUsd(duration);
      case "scro:explainer":
        return explainerEstimatedCostUsd(duration);
      case "scro:swap":
      case "scro:swap-render":
        return scroSwapCostUsd({ durationSeconds: duration, mediaKind: "video" });
      case "scro:teleport":
        return teleportCostUsd({ durationSeconds: duration });
      case "scro:teleport-render":
        // The scene image comes from a wired node, so no plate charge here.
        return mulUsd(
          VIDEO_COST_PER_SECOND_USD,
          Math.min(15, Math.max(2, Math.round(duration))),
        );
      default:
        return spec.basePriceUsd;
    }
  }

  if (spec.provider === "mentalok") {
    const markup =
      params?.markup !== undefined && Number.isFinite(params.markup) && params.markup > 0
        ? params.markup
        : canvasMentalokMarkup();
    const markedUp = roundUsd4(mulUsd(spec.basePriceUsd, markup));
    return Math.max(CANVAS_MIN_CHARGE_USD, markedUp);
  }

  if (spec.category === "image") {
    return IMAGE_COST_USD;
  }

  const duration = params?.durationSeconds ?? spec.defaultDurationSeconds ?? MIN_VIDEO_SECONDS;

  if (spec.providerModelId === OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL) {
    // Clamp HeyGen Avatar IV to 5-60s per Canvas specification, billed at $0.18/s.
    const clamped = billedVideoSeconds(duration, CANVAS_HEYGEN_MAX_VIDEO_SECONDS);
    return talkingHeadVideoCostUsd(clamped);
  }

  // Standard OpenRouter video models: $0.10/s clamped to 5-15s.
  return videoCostUsd(duration);
}

// Convenience formatter for displaying a canvas model's estimated USD price in UI labels.
export function formatCanvasModelCostUsd(
  spec: CanvasModelSpec,
  params?: CanvasCostEstimateParams,
): string {
  return formatUsd(estimateCanvasModelCostUsd(spec, params));
}
