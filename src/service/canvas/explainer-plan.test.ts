import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { explainerPlanSource, planStateFromVideo } from "@/service/canvas/explainer-plan";

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
    // Stored worker prompt wins; missing ones fall back to the local builder.
    assert.deepEqual(ready.plan?.clips.map((c) => c.framePrompt), ["stored 1", "built 2"]);
    assert.deepEqual(ready.plan?.clips.map((c) => c.videoPrompt), ["v1", "v2"]);
    assert.deepEqual(ready.plan?.clips.map((c) => c.spokenLine), ["第一句", "第二句"]);
    assert.equal(ready.plan?.plannerVideoId, videoId.toHexString());
    assert.match(ready.summary, /復利/);
  });

  it("wires the rows from the Director, adds no settings node, and frames the Director in the group", () => {
    const ready = planStateFromVideo(args(video({ canvasPlan: { prompts } })));
    assert.equal(ready.status, "ready");
    if (ready.status !== "ready") return;
    const frames = ready.nodes.filter((n) => n.data.modelId === "google:gemini-nano-banana-2.1");
    assert.ok(frames.every((n) => n.data.prompt === ""));
    assert.ok(ready.edges.some((e) => e.source === "exp" && e.sourceHandle === "clip-1-frame" && e.target === "p-frame-1"));
    assert.ok(!ready.nodes.some((n) => n.type === "settings" || n.id === "exp"));
    assert.equal(ready.group.memberIds[0], "exp");
  });

  it("records the parameters the plan started with", () => {
    const planningWith = {
      topic: "Old topic",
      aspectRatio: "9:16",
      skillSlug: "cartoon-explainer-video-director",
      language: "yue",
      presenterPosition: "auto",
    };
    const ready = planStateFromVideo({
      ...args(video({ canvasPlan: { prompts } })),
      plannerNode: { ...planner, data: { ...planner.data, prompt: "Edited meanwhile", toolParams: { ...planner.data.toolParams, planningWith } } },
    });
    assert.equal(ready.status, "ready");
    if (ready.status !== "ready") return;
    assert.equal(ready.plan?.plannedWith.topic, "Old topic");
  });

  it("keeps the voiceover in the plan source only when the topic is unchanged", () => {
    const planned: CanvasNode = {
      id: "dir",
      type: "model",
      position: { x: 0, y: 0 },
      data: {
        modelId: "scro:explainer",
        prompt: "Topic",
        toolParams: {
          plannerMode: true,
          presenterPosition: "lower-left",
          plan: {
            plannerVideoId: "v",
            plannedWith: { topic: "Topic", aspectRatio: "9:16", skillSlug: "s", language: "yue", presenterPosition: "auto" },
            clips: [{ clipNumber: 1, framePrompt: "f", videoPrompt: "m", spokenLine: "第一句", durationSeconds: 6, refUrls: [] }],
          },
        },
      },
    };
    assert.match(explainerPlanSource(planned), /第一句/);
    assert.notEqual(explainerPlanSource(planned), "Topic");
    assert.doesNotMatch(explainerPlanSource({ ...planned, data: { ...planned.data, prompt: "Other" } }), /第一句/);
  });

  it("passes each clip's reference images and resolution to the frame nodes", () => {
    const ready = planStateFromVideo({
      ...args(video({ canvasPlan: { prompts } })),
      frameInputs: {
        refsByClip: new Map([
          [1, ["https://lock.png"]],
          [2, ["https://lock.png", "https://prop.png"]],
        ]),
        resolution: "1k",
      },
    });
    assert.equal(ready.status, "ready");
    if (ready.status !== "ready") return;
    const media = ready.nodes.filter((n) => n.type === "media").map((n) => n.data.mediaUrl);
    assert.deepEqual(media, ["https://lock.png", "https://prop.png"]);
    const frames = ready.nodes.filter((n) => n.data.modelId === "google:gemini-nano-banana-2.1");
    assert.ok(frames.every((n) => n.data.resolution === "1k"));
    assert.match(ready.summary, /1\. 第一句/);
  });

  it("expands a Talking Head planner into one frame and per-clip HeyGen rows", () => {
    const thPlanner: CanvasNode = {
      ...planner,
      id: "th",
      data: { ...planner.data, modelId: "scro:talking-head" },
    };
    const ready = planStateFromVideo({
      ...args(
        video({
          talkingHeadPoseId: "handheld-selfie",
          canvasPlan: { prompts, framePrompts: [{ clipNumber: 1, prompt: "open" }] },
        }),
      ),
      plannerNode: thPlanner,
    });
    assert.equal(ready.status, "ready");
    if (ready.status !== "ready") return;
    const frames = ready.nodes.filter((n) => n.data.modelId === "openrouter:bytedance-seed/seedream-5-0-pro");
    assert.deepEqual(frames.map((n) => n.data.prompt), ["open"]);
    const heygen = ready.nodes.filter((n) => n.data.modelId === "openrouter:heygen/avatar-iv");
    assert.deepEqual(heygen.map((n) => n.data.prompt), ["v1", "v2"]);
    const grade = ready.nodes.find((n) => n.data.modelId === "ffmpeg:color-grade");
    assert.equal(grade?.data.toolParams?.gradeLook, "talking-head-selfie");
  });
});
