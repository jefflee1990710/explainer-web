import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keepRangesText, planSpeechCuts, speechCutReport } from "@/service/canvas/core/speech-cuts";

const w = (text: string, start: number, end: number) => ({ text, start, end, type: "word" as const });

describe("planSpeechCuts", () => {
  it("cuts fillers, a restarted phrase, and long pauses", () => {
    const words = [
      w("So", 0.0, 0.3),
      w("um", 0.4, 0.7),
      w("I", 0.8, 0.9),
      w("think", 0.9, 1.2),
      w("I", 1.3, 1.4),
      w("think", 1.4, 1.7),
      w("this", 1.8, 2.0),
      w("works", 4.0, 4.4),
    ];
    const { cuts, keep } = planSpeechCuts(words, 5);
    assert.deepEqual(
      cuts.map((c) => c.reason),
      ["filler", "repeat", "pause"],
    );
    assert.deepEqual(cuts[1], { start: 0.8, end: 1.3, reason: "repeat", text: "I think" });
    assert.deepEqual(keep, [
      { start: 0, end: 0.4 },
      { start: 0.7, end: 0.8 },
      { start: 1.3, end: 2.2 },
      { start: 3.8, end: 5 },
    ]);
    assert.equal(keepRangesText(keep), "0.00-0.40, 0.70-0.80, 1.30-2.20, 3.80-5.00");
    assert.match(speechCutReport(cuts, keep, 5), /5\.0s → 2\.6s/);
  });

  it("keeps a single repeated English word but cuts a repeated Chinese phrase", () => {
    const en = planSpeechCuts([w("very", 0, 0.3), w("very", 0.3, 0.6), w("good", 0.6, 0.9)], 0.9);
    assert.equal(en.cuts.length, 0);
    const zh = planSpeechCuts([w("我哋", 0, 0.4), w("我哋", 0.5, 0.9), w("去", 0.9, 1.1)], 1.1);
    assert.deepEqual(zh.cuts.map((c) => c.reason), ["repeat"]);
    assert.deepEqual(zh.keep, [{ start: 0.5, end: 1.1 }]);
  });

  it("respects the options and keeps every pause at 0", () => {
    const words = [w("um", 0, 0.3), w("hi", 2, 2.3)];
    const { cuts } = planSpeechCuts(words, 2.3, { fillers: false, repeats: true, maxPauseSec: 0 });
    assert.equal(cuts.length, 0);
  });
});
