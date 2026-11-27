// Canvas text-model prices: published USD per million tokens, then the same 1.5
// markup as other canvas models. A catalog row that already has a user price is used as-is.
// Gemini windows and flat rows are Google's AI Studio text prices (read 2026-11-27).
// ArgoLink rows are the rates on each model page (read 2026-11-27); none include a user price.
// Retired Gemini 2.5 Pro / Flash and the long-context tier on gemini-3.1-pro-preview are not listed.

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

// Gemini 4 Carbon uses the same published intro window as Argon.
const GEMINI_CARBON_WINDOWS = GEMINI_ARGON_WINDOWS;

// Flat Gemini text rates with no published cutoff on the 2026-11-27 price page.
const GEMINI_FLAT_RATES: Record<string, PublishedTokenRate> = {
  "gemini-4-neon": { inputPerMillion: 3, outputPerMillion: 15 },
  "gemini-4-hydrogen": { inputPerMillion: 1.5, outputPerMillion: 7.5 },
  "gemini-3.5-flash-lite": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-3.1-flash-lite": { inputPerMillion: 0.25, outputPerMillion: 1.5 },
  "gemini-3-flash-preview": { inputPerMillion: 0.5, outputPerMillion: 3 },
  "gemini-2.5-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
};

// ArgoLink chat models. These figures are ArgoLink's rate, not a pre-marked user price.
const ARGOLINK_TEXT_RATES: Record<string, PublishedTokenRate> = {
  "claude-opus-5": { inputPerMillion: 1.75, outputPerMillion: 8.75 },
  "claude-opus-5-5": { inputPerMillion: 1.4, outputPerMillion: 7 },
  "claude-opus-4-8": { inputPerMillion: 1.75, outputPerMillion: 8.75 },
  "claude-fable-5-2": { inputPerMillion: 2.8, outputPerMillion: 14 },
  "claude-fable-5-1": { inputPerMillion: 3.5, outputPerMillion: 17.5 },
  "claude-fable-5": { inputPerMillion: 3.5, outputPerMillion: 17.5 },
  "claude-sonnet-5": { inputPerMillion: 0.7, outputPerMillion: 3.5 },
  "claude-sonnet-5-5": { inputPerMillion: 0.7, outputPerMillion: 3.5 },
  "claude-haiku-5-5": { inputPerMillion: 0.035, outputPerMillion: 0.175 },
  "gpt-6-astra": { inputPerMillion: 2.3, outputPerMillion: 11.5 },
  "gpt-6.2-astra": { inputPerMillion: 2, outputPerMillion: 10 },
  "gpt-6.2-sol": { inputPerMillion: 0.5, outputPerMillion: 2.5 },
  "gpt-6-sol": { inputPerMillion: 0.46, outputPerMillion: 2.3 },
  "gpt-6.1-sol": { inputPerMillion: 0.46, outputPerMillion: 2.3 },
  "gpt-6.1-terra": { inputPerMillion: 0.23, outputPerMillion: 1.15 },
  "gpt-5.6-sol": { inputPerMillion: 0.92, outputPerMillion: 4.6 },
  "gpt-5.6-terra": { inputPerMillion: 0.46, outputPerMillion: 2.76 },
  "gpt-5.5": { inputPerMillion: 1.15, outputPerMillion: 6.9 },
};

const GEMINI_WINDOWS: Record<string, RateWindow[]> = {
  "gemini-3.8-flash": GEMINI_FLASH_WINDOWS,
  "gemini-3.6-flash": GEMINI_FLASH_WINDOWS,
  "gemini-4-argon": GEMINI_ARGON_WINDOWS,
  "gemini-4-carbon": GEMINI_CARBON_WINDOWS,
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
  const flat = GEMINI_FLAT_RATES[bare];
  if (flat) return flat;
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
