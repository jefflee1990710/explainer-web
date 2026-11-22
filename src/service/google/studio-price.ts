// Google AI Studio image and video prices: published provider cost × 1.5.
// Figures are from the Gemini Developer API pricing page on 2026-11-22.
// These models are not billed through OpenRouter.

import { addUsd, mulUsd } from "@/service/billing/usd";
import { OPENROUTER_PRICE_MARKUP } from "@/service/openrouter/media-price";

export const GOOGLE_STUDIO_PRICE_MARKUP = OPENROUTER_PRICE_MARKUP;

export const GOOGLE_STUDIO_NANO_BANANA_2_1 = "gemini-nano-banana-2.1";
export const GOOGLE_STUDIO_NANO_BANANA_2 = "gemini-3.1-flash-image";
export const GOOGLE_STUDIO_NANO_BANANA_2_LITE = "gemini-3.1-flash-lite-image";
export const GOOGLE_STUDIO_NANO_BANANA_PRO = "gemini-3-pro-image";
export const GOOGLE_STUDIO_NANO_BANANA = "gemini-2.5-flash-image";
export const GOOGLE_STUDIO_OMNI_12 = "gemini-omni-1.2-flash";
export const GOOGLE_STUDIO_OMNI_11 = "gemini-omni-1.1-flash";

// Omni 1.1 requests start billing at Omni 1.2 rates on this UTC instant.
const OMNI_11_RATE_SWITCH_MS = Date.UTC(2026, 11, 3);

// 720p output tokens per second, from the Omni pricing footnote.
const OMNI_TOKENS_PER_SECOND = 5792;

type ImagePrice = {
  // Provider USD for one output still. Missing sizes use `only`.
  byResolution?: { "1K": number; "2K"?: number; "4K"?: number };
  only?: number;
  // Provider USD for one input reference image, when Google publishes a per-image rate.
  inputImageUsd?: number;
  resolutions: Array<"1k" | "2k" | "4k">;
  referenceImages: number;
};

const IMAGE_PRICES: Record<string, ImagePrice> = {
  // $30 / 1M image tokens. 1K = 1120, 2K = 1680, 4K = 3780.
  [GOOGLE_STUDIO_NANO_BANANA_2_1]: {
    byResolution: { "1K": 0.0336, "2K": 0.0504, "4K": 0.1134 },
    resolutions: ["1k", "2k", "4k"],
    referenceImages: 14,
  },
  // $60 / 1M. 1K = 1120, 2K = 1680, 4K = 2520.
  [GOOGLE_STUDIO_NANO_BANANA_2]: {
    byResolution: { "1K": 0.0672, "2K": 0.1008, "4K": 0.1512 },
    resolutions: ["1k", "2k", "4k"],
    referenceImages: 14,
  },
  // Published equivalent is $0.0336 at 1K only.
  [GOOGLE_STUDIO_NANO_BANANA_2_LITE]: {
    only: 0.0336,
    resolutions: ["1k"],
    referenceImages: 14,
  },
  // Published equivalents: $0.134 at 1K and 2K, $0.24 at 4K. Input image $0.0011.
  [GOOGLE_STUDIO_NANO_BANANA_PRO]: {
    byResolution: { "1K": 0.134, "2K": 0.134, "4K": 0.24 },
    inputImageUsd: 0.0011,
    resolutions: ["1k", "2k", "4k"],
    referenceImages: 14,
  },
  // Flat $0.039 per image up to 1024px. Deprecated, shut down 2027-03-15.
  [GOOGLE_STUDIO_NANO_BANANA]: {
    only: 0.039,
    resolutions: ["1k"],
    referenceImages: 3,
  },
};

export type GoogleStudioImageModel = {
  id: string;
  name: string;
  resolutions: Array<"1k" | "2k" | "4k">;
  referenceImages: number;
};

export type GoogleStudioVideoModel = {
  id: string;
  name: string;
  referenceImages: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  defaultDurationSeconds: number;
};

export const GOOGLE_STUDIO_IMAGE_MODELS: GoogleStudioImageModel[] = [
  { id: GOOGLE_STUDIO_NANO_BANANA_2_1, name: "Nano Banana 2.1", resolutions: ["1k", "2k", "4k"], referenceImages: 14 },
  { id: GOOGLE_STUDIO_NANO_BANANA_2, name: "Nano Banana 2", resolutions: ["1k", "2k", "4k"], referenceImages: 14 },
  { id: GOOGLE_STUDIO_NANO_BANANA_2_LITE, name: "Nano Banana 2 Lite", resolutions: ["1k"], referenceImages: 14 },
  { id: GOOGLE_STUDIO_NANO_BANANA_PRO, name: "Nano Banana Pro", resolutions: ["1k", "2k", "4k"], referenceImages: 14 },
  { id: GOOGLE_STUDIO_NANO_BANANA, name: "Nano Banana", resolutions: ["1k"], referenceImages: 3 },
];

export const GOOGLE_STUDIO_VIDEO_MODELS: GoogleStudioVideoModel[] = [
  {
    id: GOOGLE_STUDIO_OMNI_12,
    name: "Gemini Omni Flash",
    referenceImages: 6,
    minDurationSeconds: 3,
    maxDurationSeconds: 15,
    defaultDurationSeconds: 10,
  },
  {
    id: GOOGLE_STUDIO_OMNI_11,
    name: "Gemini Omni 1.1 Flash",
    referenceImages: 6,
    minDurationSeconds: 3,
    maxDurationSeconds: 15,
    defaultDurationSeconds: 10,
  },
];

export function googleStudioBareModelId(modelId: string): string {
  return modelId.replace(/^(openrouter:|google:)/, "").replace(/^google\//, "");
}

function markedUp(providerUsd: number): number {
  return mulUsd(providerUsd, GOOGLE_STUDIO_PRICE_MARKUP);
}

function imageResolutionKey(resolution?: string): "1K" | "2K" | "4K" {
  const lower = (resolution || "").trim().toLowerCase();
  if (lower === "4k") return "4K";
  if (lower === "2k") return "2K";
  return "1K";
}

// One still. Resolution falls back to the only published size when the model has no tier.
export function googleStudioImageUserUsd(
  modelId: string,
  options?: { resolution?: string; referenceImages?: number },
): number {
  const price = IMAGE_PRICES[googleStudioBareModelId(modelId)];
  if (!price) return markedUp(0.0336);
  const key = imageResolutionKey(options?.resolution);
  const output =
    price.only ??
    price.byResolution?.[key] ??
    price.byResolution?.["1K"] ??
    0;
  const refs = Math.max(0, options?.referenceImages || 0);
  const input = price.inputImageUsd ? mulUsd(markedUp(price.inputImageUsd), refs) : 0;
  return addUsd(markedUp(output), input);
}

function omniProviderPerSecond(modelId: string, now: Date): number {
  const bare = googleStudioBareModelId(modelId);
  const ratePerMillion =
    bare === GOOGLE_STUDIO_OMNI_11 && now.getTime() < OMNI_11_RATE_SWITCH_MS ? 17.5 : 12;
  return (OMNI_TOKENS_PER_SECOND * ratePerMillion) / 1_000_000;
}

// 720p Omni seconds. First+last frame clips are capped at 10s by the caller.
export function googleStudioVideoUserUsd(
  modelId: string,
  options?: { durationSeconds?: number; now?: Date },
): number {
  const model =
    GOOGLE_STUDIO_VIDEO_MODELS.find((item) => item.id === googleStudioBareModelId(modelId)) ??
    GOOGLE_STUDIO_VIDEO_MODELS[0];
  const requested = options?.durationSeconds;
  const seconds = Math.min(
    model.maxDurationSeconds,
    Math.max(
      model.minDurationSeconds,
      requested !== undefined && Number.isFinite(requested)
        ? Math.round(requested)
        : model.defaultDurationSeconds,
    ),
  );
  return mulUsd(markedUp(omniProviderPerSecond(model.id, options?.now ?? new Date())), seconds);
}

export function googleStudioImageSupportsResolution(modelId: string): boolean {
  return (IMAGE_PRICES[googleStudioBareModelId(modelId)]?.resolutions.length ?? 0) > 1;
}
