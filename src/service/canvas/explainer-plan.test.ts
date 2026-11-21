import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { planStateFromVideo } from "@/service/canvas/explainer-plan";

const planner: CanvasNode = {
  id: "exp",
  type: "model",
  position: { x: 10, y: 20 },
  data: {
    modelId: "scro:explainer",
    aspectRatio: "9:16",
    toolParams: { plannerMode: true, language: "yue", characterId: "c1" },
  },
};
const videoId = new ObjectId();
const video = (extra: Partial<Project>) =>
  ({
    _id: videoId,
    status: "production",
    language: "yue",
    voiceGender: "male",
    phaseA: {
      localizedTitle: "復利",
      clips: [
        { clipNumber: 1, englishVo: "第一句", durationSeconds: 6 },
        { clipNumber: 2, englishVo: "第二句", durationSeconds: 7 },
      ],
    },
    ...extra,
  }) as unknown as Project;
const prompts = [
  { clipNumber: 1, durationSeconds: 6, prompt: "v1" },
  { clipNumber: 2, durationSeconds: 7, prompt: "v2" },
];
const args = (v: Project | null, blocker: string | null = null) => ({
  video: v,
  blocker,
  plannerNode: planner,
  buildFramePrompt: (_p: Project, n: number) => `built ${n}`,
  idPrefix: "p",
});

describe("planStateFromVideo", () => {
  it("is planning until Phase B prompts exist and locks are ready", () => {
    assert.deepEqual(planStateFromVideo(args(video({ status: "phase_a" }))), { status: "planning" });
    assert.deepEqual(planStateFromVideo(args(video({}))), { status: "planning" });
    assert.deepEqual(
      planStateFromVideo(args(video({ canvasPlan: { prompts } }), "角色定裝圖正在產生")),
      { status: "planning" },
    );
  });

  it("reports failures", () => {
    assert.equal(planStateFromVideo(args(null)).status, "failed");
    assert.deepEqual(planStateFromVideo(args(video({ status: "failed", error: "boom" }))), {
      status: "failed",
      error: "boom",
    });
    assert.deepEqual(
      planStateFromVideo(args(video({ canvasPlan: { prompts: [], error: "filtered" } }))),
      { status: "failed", error: "filtered" },
    );
  });

  it("returns the expansion when ready", () => {
    const ready = planStateFromVideo(
      args(video({ canvasPlan: { prompts, framePrompts: [{ clipNumber: 1, prompt: "stored 1" }] } })),
    );
    assert.equal(ready.status, "ready");
    if (ready.status !== "ready") return;
    const tts = ready.nodes.filter((n) => n.data.modelId === "scro:tts");
    assert.deepEqual(tts.map((n) => n.data.toolParams?.voicePreset), ["alan", "alan"]);
    assert.equal(tts[0]!.data.toolParams?.characterId, "c1");
    const frames = ready.nodes.filter((n) => n.data.modelId === "scro:explainer-frame");
    // Stored worker prompt wins; missing ones fall back to the local builder.
    assert.deepEqual(frames.map((n) => n.data.prompt), ["stored 1", "built 2"]);
    assert.match(ready.summary, /復利/);
    assert.match(ready.summary, /1\. 第一句/);
  });
});
