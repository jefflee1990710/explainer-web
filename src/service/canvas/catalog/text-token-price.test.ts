import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mulUsd } from "@/service/billing/usd";
import { OPENROUTER_PRICE_MARKUP } from "@/service/openrouter/media-price";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import {
  CANVAS_TEXT_PRICE_MARKUP,
  canvasTextProviderRates,
  canvasTextUserRates,
  formatTextTokenRate,
  markedUpTokenRates,
  textTokenCostUsd,
} from "@/service/canvas/catalog/text-token-price";

const ON_2026_11_27 = new Date("2026-11-27T09:00:00.000Z");
const ARGON_CUTOVER = new Date("2026-12-01T00:00:00.000Z");
const FLASH_CUTOVER = new Date("2027-01-01T00:00:00.000Z");

describe("canvas text token prices", () => {
  it("marks provider rates up by 1.5 unless the catalog already has a user price", () => {
    assert.equal(CANVAS_TEXT_PRICE_MARKUP, OPENROUTER_PRICE_MARKUP);
    assert.equal(CANVAS_TEXT_PRICE_MARKUP, 1.5);
    const marked = markedUpTokenRates({ inputPerMillion: 0.7, outputPerMillion: 3.5 });
    assert.equal(marked.inputUsdPerMillion, mulUsd(0.7, 1.5));
    assert.equal(marked.outputUsdPerMillion, mulUsd(3.5, 1.5));
    const listed = markedUpTokenRates({
      inputPerMillion: 0.7,
      outputPerMillion: 3.5,
      userInputPerMillion: 0.9,
      userOutputPerMillion: 4,
    });
    assert.deepEqual(listed, { inputUsdPerMillion: 0.9, outputUsdPerMillion: 4 });
  });

  it("uses the published Gemini and ArgoLink rates on 2026-11-27, then the later Gemini windows", () => {
    assert.deepEqual(canvasTextProviderRates("gemini-3.8-flash", ON_2026_11_27), {
      inputUsdPerMillion: 0.75,
      outputUsdPerMillion: 3.75,
    });
    assert.deepEqual(canvasTextUserRates("google:gemini-3.8-flash", ON_2026_11_27), {
      inputUsdPerMillion: 1.125,
      outputUsdPerMillion: 5.625,
    });
    assert.deepEqual(canvasTextUserRates("gemini-4-argon", new Date("2026-11-30T23:59:59.000Z")), {
      inputUsdPerMillion: 3,
      outputUsdPerMillion: 15,
    });
    assert.deepEqual(canvasTextUserRates("google:gemini-4-argon", ARGON_CUTOVER), {
      inputUsdPerMillion: 6,
      outputUsdPerMillion: 30,
    });
    assert.deepEqual(canvasTextUserRates("gemini-3.8-flash", new Date("2026-12-31T23:59:59.000Z")), {
      inputUsdPerMillion: 1.125,
      outputUsdPerMillion: 5.625,
    });
    assert.deepEqual(canvasTextUserRates("gemini-3.8-flash", FLASH_CUTOVER), {
      inputUsdPerMillion: 2.25,
      outputUsdPerMillion: 11.25,
    });

    assert.deepEqual(canvasTextProviderRates("claude-sonnet-5-5", ON_2026_11_27), {
      inputUsdPerMillion: 0.7,
      outputUsdPerMillion: 3.5,
    });
    assert.deepEqual(canvasTextUserRates("argolink:claude-sonnet-5-5", ARGON_CUTOVER), {
      inputUsdPerMillion: 1.05,
      outputUsdPerMillion: 5.25,
    });
    assert.deepEqual(canvasTextProviderRates("gpt-5.6-sol", ON_2026_11_27), {
      inputUsdPerMillion: 0.92,
      outputUsdPerMillion: 4.6,
    });
    assert.deepEqual(canvasTextUserRates("argolink:gpt-5.6-sol", ON_2026_11_27), {
      inputUsdPerMillion: 1.38,
      outputUsdPerMillion: 6.9,
    });
  });

  it("bills input and output tokens per million and rounds each side to $0.0001", () => {
    const flash = canvasTextUserRates("gemini-3.8-flash", ON_2026_11_27);
    assert.equal(textTokenCostUsd(flash, { inputTokens: 1_000_000, outputTokens: 0 }), 1.125);
    assert.equal(textTokenCostUsd(flash, { inputTokens: 0, outputTokens: 1_000_000 }), 5.625);
    // 100,000 × $1.125 + 8,000 × $5.625 = $0.1125 + $0.045.
    assert.equal(textTokenCostUsd(flash, { inputTokens: 100_000, outputTokens: 8_000 }), 0.1575);
    // One token is below $0.0001 and rounds to zero. 89 input tokens round up to $0.0001.
    assert.equal(textTokenCostUsd(flash, { inputTokens: 1, outputTokens: 1 }), 0);
    assert.equal(textTokenCostUsd(flash, { inputTokens: 89, outputTokens: 0 }), 0.0001);
    assert.equal(textTokenCostUsd(flash, { inputTokens: -5, outputTokens: Number.NaN }), 0);

    const claude = canvasTextUserRates("claude-sonnet-5-5", ON_2026_11_27);
    assert.equal(textTokenCostUsd(claude, { inputTokens: 2_000_000, outputTokens: 500_000 }), 4.725);
    const gpt = canvasTextUserRates("gpt-5.6-sol", ON_2026_11_27);
    assert.equal(textTokenCostUsd(gpt, { inputTokens: 1_000_000, outputTokens: 1_000_000 }), 8.28);

    const spec = findCanvasModel("google:gemini-3.8-flash");
    assert.ok(spec);
    assert.equal(estimateCanvasModelCostUsd(spec), 0);
    assert.equal(
      estimateCanvasModelCostUsd(spec, {
        inputTokens: 100_000,
        outputTokens: 8_000,
        pricedAt: ON_2026_11_27,
      }),
      0.1575,
    );
    assert.equal(
      formatTextTokenRate(flash, true),
      "$1.125/百萬輸入 · $5.625/百萬輸出",
    );
    assert.equal(formatTextTokenRate(gpt, false), "$1.38/1M in · $6.9/1M out");
  });
});
