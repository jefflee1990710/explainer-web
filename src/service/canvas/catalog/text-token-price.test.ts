import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mulUsd } from "@/service/billing/usd";
import { OPENROUTER_PRICE_MARKUP } from "@/service/openrouter/media-price";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { TEXT_STATIC_MODELS } from "@/service/canvas/catalog/text-models";
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

  it("marks up every listed Gemini, Claude, and GPT text model by 1.5", () => {
    const userOn = (id: string, asOf = ON_2026_11_27) => canvasTextUserRates(id, asOf);
    assert.deepEqual(userOn("google:gemini-4-carbon"), { inputUsdPerMillion: 3, outputUsdPerMillion: 15 });
    assert.deepEqual(userOn("gemini-4-carbon", ARGON_CUTOVER), { inputUsdPerMillion: 6, outputUsdPerMillion: 30 });
    assert.deepEqual(userOn("google:gemini-4-neon"), { inputUsdPerMillion: 4.5, outputUsdPerMillion: 22.5 });
    assert.deepEqual(userOn("gemini-4-hydrogen"), { inputUsdPerMillion: 2.25, outputUsdPerMillion: 11.25 });
    assert.deepEqual(userOn("gemini-3.6-flash"), userOn("gemini-3.8-flash"));
    assert.deepEqual(userOn("gemini-3.6-flash", FLASH_CUTOVER), userOn("gemini-3.8-flash", FLASH_CUTOVER));
    assert.deepEqual(userOn("gemini-3.5-flash-lite"), { inputUsdPerMillion: 0.45, outputUsdPerMillion: 3.75 });
    assert.deepEqual(userOn("gemini-3.1-flash-lite"), { inputUsdPerMillion: 0.375, outputUsdPerMillion: 2.25 });
    assert.deepEqual(userOn("gemini-3-flash-preview"), { inputUsdPerMillion: 0.75, outputUsdPerMillion: 4.5 });
    assert.deepEqual(userOn("gemini-2.5-flash-lite"), { inputUsdPerMillion: 0.15, outputUsdPerMillion: 0.6 });

    assert.deepEqual(userOn("argolink:claude-opus-5"), { inputUsdPerMillion: 2.625, outputUsdPerMillion: 13.125 });
    assert.deepEqual(userOn("claude-opus-5-5"), { inputUsdPerMillion: 2.1, outputUsdPerMillion: 10.5 });
    assert.deepEqual(userOn("claude-opus-4-8"), userOn("claude-opus-5"));
    assert.deepEqual(userOn("claude-fable-5"), { inputUsdPerMillion: 5.25, outputUsdPerMillion: 26.25 });
    assert.deepEqual(userOn("claude-fable-5-1"), userOn("claude-fable-5"));
    assert.deepEqual(userOn("claude-fable-5-2"), { inputUsdPerMillion: 4.2, outputUsdPerMillion: 21 });
    assert.deepEqual(userOn("claude-sonnet-5"), userOn("claude-sonnet-5-5"));
    assert.deepEqual(userOn("claude-haiku-5-5"), { inputUsdPerMillion: 0.0525, outputUsdPerMillion: 0.2625 });
    assert.deepEqual(userOn("gpt-6-astra"), { inputUsdPerMillion: 3.45, outputUsdPerMillion: 17.25 });
    assert.deepEqual(userOn("gpt-6.2-astra"), { inputUsdPerMillion: 3, outputUsdPerMillion: 15 });
    assert.deepEqual(userOn("gpt-5.5"), { inputUsdPerMillion: 1.725, outputUsdPerMillion: 10.35 });
    assert.deepEqual(userOn("gpt-5.6-terra"), { inputUsdPerMillion: 0.69, outputUsdPerMillion: 4.14 });
    assert.deepEqual(userOn("gpt-6.2-sol"), { inputUsdPerMillion: 0.75, outputUsdPerMillion: 3.75 });
    assert.deepEqual(userOn("gpt-6-sol"), { inputUsdPerMillion: 0.69, outputUsdPerMillion: 3.45 });
    assert.deepEqual(userOn("gpt-6.1-sol"), userOn("gpt-6-sol"));
    assert.deepEqual(userOn("gpt-6.1-terra"), { inputUsdPerMillion: 0.345, outputUsdPerMillion: 1.725 });

    assert.equal(TEXT_STATIC_MODELS.length, 28);
    for (const spec of TEXT_STATIC_MODELS) {
      const provider = canvasTextProviderRates(spec.providerModelId, ON_2026_11_27);
      const user = canvasTextUserRates(spec.id, ON_2026_11_27);
      assert.equal(user.inputUsdPerMillion, mulUsd(provider.inputUsdPerMillion, 1.5), spec.id);
      assert.equal(user.outputUsdPerMillion, mulUsd(provider.outputUsdPerMillion, 1.5), spec.id);
      assert.equal(estimateCanvasModelCostUsd(spec), 0);
    }
    assert.throws(() => canvasTextUserRates("gemini-2.5-pro", ON_2026_11_27), /token 價錢/);
  });
});
