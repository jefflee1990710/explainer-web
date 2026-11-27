// ArgoLink video prices: ArgoLink's per-second rate × 1.5, like OpenRouter and Google.
// MAGI-2 from https://argolink.io/en/models/magi-2 on 2026-11-27: $0.068 per output second at 1080p.
// Reference images and audio are free; failed jobs are not charged by ArgoLink.

import { mulUsd } from "@/service/billing/usd";
import { OPENROUTER_PRICE_MARKUP } from "@/service/openrouter/media-price";
import { ARGOLINK_MAGI_2, magi2DurationSeconds } from "@/service/argolink/client";

export const ARGOLINK_PRICE_MARKUP = OPENROUTER_PRICE_MARKUP;

// Provider USD per output second.
const PROVIDER_USD_PER_SECOND: Record<string, number> = {
  [ARGOLINK_MAGI_2]: 0.068,
};

export function argolinkVideoUserUsdPerSecond(modelId: string): number {
  const bare = modelId.replace(/^argolink:/, "");
  return mulUsd(PROVIDER_USD_PER_SECOND[bare] ?? PROVIDER_USD_PER_SECOND[ARGOLINK_MAGI_2], ARGOLINK_PRICE_MARKUP);
}

// Whole seconds within MAGI-2's 4–30s range, priced per second.
export function argolinkVideoUserUsd(modelId: string, options?: { durationSeconds?: number }): number {
  return mulUsd(argolinkVideoUserUsdPerSecond(modelId), magi2DurationSeconds(options?.durationSeconds));
}
