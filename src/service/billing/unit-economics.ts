import { FRAMES_COST, MIN_VIDEO_COST, MIN_VIDEO_SECONDS } from "@/service/credit-costs";

// Provider COGS used to set list prices (checked 2026-09).
// Image: Marketing Studio Flare ~$0.075 (Qwen Image 3 is $0.04).
// Video: MiniMax H3 image-to-video at 2K, $0.13 per second.
// Cinematic realistic uses Seedance 2.0 at 1080p, about $0.68 per second.
export const IMAGE_COGS_USD = 0.075;
export const VIDEO_COGS_PER_SECOND_USD = 0.13;

// Typical clip: two Flare frames + a 5s video, spread over its credits.
export const TYPICAL_COGS_PER_CREDIT_USD =
  (2 * IMAGE_COGS_USD + MIN_VIDEO_SECONDS * VIDEO_COGS_PER_SECOND_USD) /
  (FRAMES_COST + MIN_VIDEO_COST);

export function typicalCogsUsd(credits: number) {
  return credits * TYPICAL_COGS_PER_CREDIT_USD;
}

export function typicalGrossMargin(amountUsd: number, credits: number) {
  if (amountUsd <= 0) return 0;
  return (amountUsd - typicalCogsUsd(credits)) / amountUsd;
}
