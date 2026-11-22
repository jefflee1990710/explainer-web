import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Project } from "@/model/project";
import {
  collectPhaseBPrompts,
  talkingHeadPlanPrompts,
} from "@/service/canvas/explainer-plan-phase-b";
import { heyGenAvatarIvMotionPrompt } from "@/service/openrouter/generate";

describe("talkingHeadPlanPrompts", () => {
  it("builds the HeyGen motion prompt per clip with its duration", () => {
    const project = {
      talkingHeadPoseId: "waist-up",
      language: "yue",
      phaseA: {
        clips: [
          { clipNumber: 1, englishVo: "第一句", motionCamera: "nod", motionPrompt: "smile", durationSeconds: 9 },
          { clipNumber: 2, englishVo: "第二句", motionCamera: "lean", durationSeconds: 12 },
        ],
      },
    } as unknown as Project;
    const out = talkingHeadPlanPrompts(project);
    assert.deepEqual(out, [
      {
        clipNumber: 1,
        durationSeconds: 9,
        prompt: heyGenAvatarIvMotionPrompt("waist-up", {
          spokenScript: "第一句",
          directorMotionNote: "nod",
          motionPrompt: "smile",
          language: "yue",
        }),
      },
      {
        clipNumber: 2,
        durationSeconds: 12,
        prompt: heyGenAvatarIvMotionPrompt("waist-up", {
          spokenScript: "第二句",
          directorMotionNote: "lean",
          motionPrompt: undefined,
          language: "yue",
        }),
      },
    ]);
  });
});

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
