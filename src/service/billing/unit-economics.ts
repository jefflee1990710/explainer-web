import { FRAMES_COST_USD, MIN_VIDEO_COST_USD, MIN_VIDEO_SECONDS } from "@/service/credit-costs";

// Provider COGS used to evaluate USD credit unit economics (aligned with pipeline-models.md).
// Image: Seedream 5.0 Pro ~$0.04/image.
// Video: blended standard video COGS ~$0.04/s across Hailuo 3 / self-hosted ComfyUI ref2va (HeyGen Avatar IV is $0.05/s).
export const IMAGE_COGS_USD = 0.04;
export const VIDEO_COGS_PER_SECOND_USD = 0.04;

// Baseline provider COGS per $1.00 of USD credit spent on a typical 2-frame + 5s video clip ($0.28 / $0.80 = 0.35).
export const TYPICAL_COGS_PER_USD_CREDIT =
  (2 * IMAGE_COGS_USD + MIN_VIDEO_SECONDS * VIDEO_COGS_PER_SECOND_USD) /
  (FRAMES_COST_USD + MIN_VIDEO_COST_USD);

// Expected provider COGS in USD when a customer consumes `creditUsd` of balance.
export function typicalCogsUsd(creditUsd: number) {
  return creditUsd * TYPICAL_COGS_PER_USD_CREDIT;
}

// Expected gross margin ratio given real cash collected (`amountUsd`) and granted USD credit (`creditUsd`).
export function typicalGrossMargin(amountUsd: number, creditUsd: number) {
  if (amountUsd <= 0) return 0;
  return (amountUsd - typicalCogsUsd(creditUsd)) / amountUsd;
}
