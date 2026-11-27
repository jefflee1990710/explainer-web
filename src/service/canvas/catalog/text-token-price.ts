// Canvas text-model prices: published USD per million tokens, then the same 1.5
// markup as other canvas models. A catalog row that already has a user price is used as-is.
// Gemini windows are Google's published schedule (AI Studio pricing, read 2026-11-27).
// ArgoLink rows are the rates on each model page (read 2026-11-27); none include a user price.

import { addUsd, mulUsd, roundUsd4 } from "@/service/billing/usd";

// Same 1.5 used for OpenRouter, Google media, and ArgoLink video (`OPENROUTER_PRICE_MARKUP`).
export const CANVAS_TEXT_PRICE_MARKUP = 1.5;

export type TextTokenRates = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

// Provider list price. `user*` is the price already charged to the user, when the catalog publishes one.
type PublishedTokenRate = {
  inputPerMillion: number;
  outputPerMillion: number;
  userInputPerMillion?: number;
  userOutputPerMillion?: number;
};

type RateWindow = PublishedTokenRate & { untilMs: number };

// Paid tier through the last instant before the next published rate.
const GEMINI_FLASH_WINDOWS: RateWindow[] = [
  { untilMs: Date.UTC(2027, 0, 1), inputPerMillion: 0.75, outputPerMillion: 3.75 },
  { untilMs: Number.POSITIVE_INFINITY, inputPerMillion: 1.5, outputPerMillion: 7.5 },
];

const GEMINI_ARGON_WINDOWS: RateWindow[] = [
  { untilMs: Date.UTC(2026, 11, 1), inputPerMillion: 2, outputPerMillion: 10 },
  { untilMs: Number.POSITIVE_INFINITY, inputPerMillion: 4, outputPerMillion: 20 },
];

// ArgoLink chat models. These figures are ArgoLink's rate, not a pre-marked user price.
const ARGOLINK_TEXT_RATES: Record<string, PublishedTokenRate> = {
  "claude-sonnet-5-5": { inputPerMillion: 0.7, outputPerMillion: 3.5 },
  "gpt-5.6-sol": { inputPerMillion: 0.92, outputPerMillion: 4.6 },
};

const GEMINI_WINDOWS: Record<string, RateWindow[]> = {
  "gemini-3.8-flash": GEMINI_FLASH_WINDOWS,
  "gemini-4-argon": GEMINI_ARGON_WINDOWS,
};

export function canvasTextModelBareId(modelId: string): string {
  return modelId.replace(/^(google:|argolink:)/, "");
}

export function isArgolinkCanvasTextModel(modelId: string): boolean {
  return Object.hasOwn(ARGOLINK_TEXT_RATES, canvasTextModelBareId(modelId));
}

// Applies 1.5 unless both user prices are already on the row.
export function markedUpTokenRates(provider: PublishedTokenRate): TextTokenRates {
  if (
    provider.userInputPerMillion !== undefined &&
    provider.userOutputPerMillion !== undefined
  ) {
    return {
      inputUsdPerMillion: provider.userInputPerMillion,
      outputUsdPerMillion: provider.userOutputPerMillion,
    };
  }
  return {
    inputUsdPerMillion: mulUsd(provider.inputPerMillion, CANVAS_TEXT_PRICE_MARKUP),
    outputUsdPerMillion: mulUsd(provider.outputPerMillion, CANVAS_TEXT_PRICE_MARKUP),
  };
}

function providerRate(modelId: string, asOf: Date): PublishedTokenRate {
  const bare = canvasTextModelBareId(modelId);
  const argolink = ARGOLINK_TEXT_RATES[bare];
  if (argolink) return argolink;
  const windows = GEMINI_WINDOWS[bare];
  if (!windows) throw new Error(`沒有這個文字模型的 token 價錢：${bare}`);
  const at = asOf.getTime();
  return windows.find((window) => at < window.untilMs) ?? windows[windows.length - 1]!;
}

// User price per million tokens for one canvas text model.
export function canvasTextUserRates(modelId: string, asOf: Date = new Date()): TextTokenRates {
  return markedUpTokenRates(providerRate(modelId, asOf));
}

// Provider price per million tokens, before the canvas markup.
export function canvasTextProviderRates(modelId: string, asOf: Date = new Date()): TextTokenRates {
  const provider = providerRate(modelId, asOf);
  return {
    inputUsdPerMillion: provider.inputPerMillion,
    outputUsdPerMillion: provider.outputPerMillion,
  };
}

export type TextTokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

function tokenCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

// USD for one run: (tokens / 1,000,000) × the user rate, rounded to $0.0001 on each side.
export function textTokenCostUsd(rates: TextTokenRates, usage: TextTokenUsage): number {
  const input = mulUsd(rates.inputUsdPerMillion, tokenCount(usage.inputTokens) / 1_000_000);
  const output = mulUsd(rates.outputUsdPerMillion, tokenCount(usage.outputTokens) / 1_000_000);
  return addUsd(input, output);
}

// Rate label for the model picker. Keeps sub-cent precision that formatUsd would round away.
export function formatTokenUsd(amount: number): string {
  const abs = Math.abs(roundUsd4(amount));
  const body = abs.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return `$${body || "0"}`;
}

export function formatTextTokenRate(rates: TextTokenRates, isZh: boolean): string {
  const input = formatTokenUsd(rates.inputUsdPerMillion);
  const output = formatTokenUsd(rates.outputUsdPerMillion);
  return isZh
    ? `${input}/百萬輸入 · ${output}/百萬輸出`
    : `${input}/1M in · ${output}/1M out`;
}
