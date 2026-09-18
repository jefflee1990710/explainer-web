// Provider COGS used to set list prices. Typical clip: 5s Wan 3.0 @ 720p
// + 2× GPT Image 1.5 medium 1K + amortized still / Gemini / Blob.
// Medium-quality GPT Image frames add about $0.075 per clip.
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
