// Provider COGS used to set list prices. Typical clip: 5s Wan 3.0 @ 720p
// + 2× Qwen Image 3 (~$0.04 each via Higgsfield estimate) + amortized still / Gemini / Blob.
// Two frames add about $0.08 per clip; video dominates COGS.
// 3 user credits per finished clip (start frame, end frame, video).

export const TYPICAL_COGS_PER_CREDIT_USD = 0.225;
export const WORST_COGS_PER_CREDIT_USD = 0.34;

export function typicalCogsUsd(credits: number) {
  return credits * TYPICAL_COGS_PER_CREDIT_USD;
}

export function typicalGrossMargin(amountUsd: number, credits: number) {
  if (amountUsd <= 0) return 0;
  return (amountUsd - typicalCogsUsd(credits)) / amountUsd;
}
