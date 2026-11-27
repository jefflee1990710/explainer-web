import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPLAINER_CARD_LENGTHS,
  explainerCardDurationPreset,
  explainerCardLength,
} from "@/service/canvas/directors/explainer-length";

describe("explainer card length", () => {
  it("defaults a blank card to Auto and keeps the fixed lengths", () => {
    assert.deepEqual(EXPLAINER_CARD_LENGTHS, ["auto", "15s", "30s", "45s", "60s"]);
    assert.equal(explainerCardLength(undefined), "auto");
    assert.equal(explainerCardLength(""), "auto");
    assert.equal(explainerCardLength("nope"), "auto");
    assert.equal(explainerCardLength("15s"), "15s");
    assert.equal(explainerCardLength("60s"), "60s");
  });

  it("lets Auto choose the clip count, and maps each fixed length to its existing budget", () => {
    assert.equal(explainerCardDurationPreset(undefined), "auto");
    assert.equal(explainerCardDurationPreset("auto"), "auto");
    assert.equal(explainerCardDurationPreset("15s"), "micro");
    assert.equal(explainerCardDurationPreset("30s"), "short");
    assert.equal(explainerCardDurationPreset("45s"), "punchy");
    assert.equal(explainerCardDurationPreset("60s"), "full");
  });
});
