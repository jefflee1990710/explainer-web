// User USD Credit for an OpenRouter image or video: provider SKU × 1.5.
// SKUs are the public catalog snapshot in `media-price-skus.ts`.

import { addUsd, mulUsd, roundUsd4 } from "@/service/billing/usd";
import {
  OPENROUTER_IMAGE_SKUS,
  OPENROUTER_VIDEO_SKUS,
  type OpenRouterImageSku,
  type OpenRouterVideoSku,
} from "@/service/openrouter/media-price-skus";

export const OPENROUTER_PRICE_MARKUP = 1.5;

export const SEEDREAM_5_PRO_IMAGE_MODEL = "bytedance-seed/seedream-5-0-pro";
export const HAILUO_3_VIDEO_MODEL = "minimax/hailuo-3";
export const HEYGEN_AVATAR_IV_VIDEO_MODEL = "heygen/avatar-iv";
export const NANO_BANANA_2_1_IMAGE_MODEL = "google/gemini-nano-banana-2.1";

// Provider dollars → the amount we debit. `mulUsd` keeps 4 decimal places.
export function markedUpOpenRouterUsd(providerUsd: number): number {
  return mulUsd(providerUsd, OPENROUTER_PRICE_MARKUP);
}

function canonicalMediaModelId(modelId: string): string {
  const bare = modelId.replace(/^(openrouter:|google:)/, "");
  if (bare === "gemini-nano-banana-2.1") return NANO_BANANA_2_1_IMAGE_MODEL;
  return bare;
}

// Resolution the image request sends when the caller leaves it unset.
export function defaultOpenRouterImageResolution(modelId: string): string {
  if (canonicalMediaModelId(modelId) === "bytedance-seed/seedream-5-0-lite") return "2K";
  return "1K";
}

// Resolution `openRouterClipVideoBody` sends when the node does not override it.
export function defaultOpenRouterVideoResolution(modelId: string): string {
  const id = canonicalMediaModelId(modelId);
  if (id === HAILUO_3_VIDEO_MODEL) return "2K";
  if (id === "alibaba/wan-3.0") return "480p";
  if (id === HEYGEN_AVATAR_IV_VIDEO_MODEL) return "1080p";
  return "720p";
}

function imageResolutionKey(resolution: string): string {
  const lower = resolution.trim().toLowerCase();
  if (lower === "1k" || lower === "2k" || lower === "4k") return lower.toUpperCase();
  if (lower === "1.5k") return "1.5K";
  return resolution.trim();
}

function videoResolutionKey(resolution: string): string {
  return resolution.trim().toLowerCase();
}

// Square megapixels for a 1K / 2K / 4K still. 1024² is 1.048576 MP.
function imageMegapixels(resolution: string): number {
  const key = imageResolutionKey(resolution);
  const side = key === "4K" ? 4096 : key === "2K" ? 2048 : 1024;
  return (side * side) / 1_000_000;
}

// Output pixels used to turn a per-video-token SKU into a per-second price.
function videoPixels(resolution: string): { width: number; height: number } {
  switch (videoResolutionKey(resolution)) {
    case "480p":
      return { width: 854, height: 480 };
    case "768p":
      return { width: 1280, height: 768 };
    case "1080p":
      return { width: 1920, height: 1080 };
    case "2k":
      return { width: 2560, height: 1440 };
    case "4k":
      return { width: 3840, height: 2160 };
    default:
      return { width: 1280, height: 720 };
  }
}

function imageOutputProviderUsd(sku: OpenRouterImageSku, resolution: string): number {
  if (sku.unit === "megapixel") {
    return roundUsd4(sku.usd * imageMegapixels(resolution));
  }
  if (sku.unit === "token") {
    const key = imageResolutionKey(resolution);
    // Models without a published token table are quoted at the 1K Gemini count (1120).
    const tokens =
      sku.tokens?.[key === "2K" || key === "4K" || key === "1K" ? key : "1K"] ?? 1120;
    return roundUsd4(sku.outputTokenUsd * tokens);
  }
  const key = imageResolutionKey(resolution);
  if (sku.byResolution?.[key] !== undefined) return sku.byResolution[key];
  const medium = sku.byResolution?.[`MEDIUM_${key}`];
  if (medium !== undefined) return medium;
  if ((key === "2K" || key === "4K") && sku.byResolution?.["2K"] !== undefined) {
    return sku.byResolution["2K"];
  }
  return sku.outputUsd;
}

// One generated image, plus each billed reference image. Output-only when `referenceImages` is 0.
export function openRouterImageUserUsd(
  modelId: string,
  options?: { resolution?: string; referenceImages?: number },
): number {
  const id = canonicalMediaModelId(modelId);
  const resolution = options?.resolution?.trim() || defaultOpenRouterImageResolution(id);
  const refs = Math.max(0, Math.round(options?.referenceImages ?? 0));
  const sku = OPENROUTER_IMAGE_SKUS[id];
  if (!sku) {
    if (id === SEEDREAM_5_PRO_IMAGE_MODEL) return 0;
    return openRouterImageUserUsd(SEEDREAM_5_PRO_IMAGE_MODEL, { resolution, referenceImages: refs });
  }
  const output = imageOutputProviderUsd(sku, resolution);
  const input = sku.unit === "image" ? roundUsd4(sku.inputImageUsd * refs) : 0;
  return markedUpOpenRouterUsd(addUsd(output, input));
}

function videoProviderPerSecondUsd(sku: OpenRouterVideoSku, resolution: string): number {
  if (sku.videoTokenUsd !== undefined || sku.videoTokenUsdByResolution) {
    const key = videoResolutionKey(resolution);
    const rate = sku.videoTokenUsdByResolution?.[key] ?? sku.videoTokenUsd;
    if (rate === undefined) return 0;
    const { width, height } = videoPixels(key);
    const tokensPerSecond = (width * height * 24) / 1024;
    return roundUsd4(rate * tokensPerSecond);
  }
  const key = videoResolutionKey(resolution);
  if (sku.perSecondByResolution?.[key] !== undefined) return sku.perSecondByResolution[key];
  if (sku.perSecondUsd !== undefined) return sku.perSecondUsd;
  const tiers = Object.values(sku.perSecondByResolution ?? {});
  return tiers.length > 0 ? Math.min(...tiers) : 0;
}

export function openRouterVideoUserPerSecondUsd(modelId: string, resolution?: string): number {
  const id = canonicalMediaModelId(modelId);
  const resolved = resolution?.trim() || defaultOpenRouterVideoResolution(id);
  const sku = OPENROUTER_VIDEO_SKUS[id];
  if (!sku) {
    if (id === HAILUO_3_VIDEO_MODEL) return 0;
    return openRouterVideoUserPerSecondUsd(HAILUO_3_VIDEO_MODEL, "2K");
  }
  return markedUpOpenRouterUsd(videoProviderPerSecondUsd(sku, resolved));
}

// Full clip price: per-second SKU × seconds, reference-image SKU, then the provider minimum.
export function openRouterVideoUserUsd(
  modelId: string,
  options?: { durationSeconds?: number; resolution?: string; referenceImages?: number },
): number {
  const id = canonicalMediaModelId(modelId);
  const seconds = Math.max(0, Math.round(options?.durationSeconds ?? 0));
  const resolution = options?.resolution?.trim() || defaultOpenRouterVideoResolution(id);
  const refs = Math.max(0, Math.round(options?.referenceImages ?? 0));
  const sku = OPENROUTER_VIDEO_SKUS[id];
  if (!sku) {
    if (id === HAILUO_3_VIDEO_MODEL) return 0;
    return openRouterVideoUserUsd(HAILUO_3_VIDEO_MODEL, {
      durationSeconds: seconds,
      resolution: "2K",
      referenceImages: refs,
    });
  }
  const perSecond = videoProviderPerSecondUsd(sku, resolution);
  const references = roundUsd4((sku.referenceImageUsd ?? 0) * refs);
  const provider = addUsd(mulUsd(perSecond, seconds), references);
  const withMinimum =
    sku.minimumUsd !== undefined && provider < sku.minimumUsd ? sku.minimumUsd : provider;
  return markedUpOpenRouterUsd(withMinimum);
}
