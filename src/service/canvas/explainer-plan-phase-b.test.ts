import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectPhaseBPrompts } from "@/service/canvas/explainer-plan-phase-b";

describe("collectPhaseBPrompts", () => {
  it("returns prompts in clip order with bounded concurrency", async () => {
    let active = 0;
    let peak = 0;
    const out = await collectPhaseBPrompts(
      [1, 2, 3, 4, 5],
      async (n) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, (6 - n) * 3));
        active -= 1;
        return { clipNumber: n, durationSeconds: 6, prompt: `p${n}` };
      },
      2,
    );
    assert.deepEqual(out.map((p) => p.prompt), ["p1", "p2", "p3", "p4", "p5"]);
    assert.ok(peak <= 2);
  });

  it("rejects when any clip fails", async () => {
    await assert.rejects(
      collectPhaseBPrompts([1, 2], async (n) => {
        if (n === 2) throw new Error("filtered");
        return { clipNumber: n, durationSeconds: 5, prompt: "ok" };
      }),
      /filtered/,
    );
  });
});
