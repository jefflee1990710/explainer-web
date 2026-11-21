import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { pollExplainerFrame, submitExplainerFrame } from "@/service/canvas/explainer-frame";

const videoId = new ObjectId();
const node: CanvasNode = {
  id: "f1",
  type: "model",
  position: { x: 0, y: 0 },
  data: {
    modelId: "scro:explainer-frame",
    prompt: "edited",
    toolParams: { plannerVideoId: videoId.toHexString(), clipNumber: 2 },
  },
};
const video = (frames: Project["frames"] = []) =>
  ({
    _id: videoId,
    clerkUserId: "u1",
    status: "production",
    phaseA: { clips: [{ clipNumber: 2 }] },
    frames,
  }) as unknown as Project;

describe("submitExplainerFrame", () => {
  it("stores the edited prompt then regenerates the start frame", async () => {
    const calls: string[] = [];
    const res = await submitExplainerFrame(
      { clerkUserId: "u1", node, prompt: "edited" },
      {
        findVideo: async (id, uid) => (id.equals(videoId) && uid === "u1" ? video() : null),
        stillBlocker: async () => null,
        storeStartPrompt: async (_id, clip, prompt, hasFrame) => {
          calls.push(`store:${clip}:${prompt}:${hasFrame}`);
        },
        regenerateStart: async (_p, clip) => {
          calls.push(`regen:${clip}`);
        },
      },
    );
    assert.deepEqual(calls, ["store:2:edited:false", "regen:2"]);
    assert.deepEqual(res, {
      domainKind: "explainer_frame",
      externalJobId: `${videoId.toHexString()}:2`,
    });
  });

  it("refuses another user's video and blocked locks", async () => {
    await assert.rejects(
      submitExplainerFrame({ clerkUserId: "u2", node, prompt: "x" }, { findVideo: async () => null }),
      /找不到/,
    );
    await assert.rejects(
      submitExplainerFrame(
        { clerkUserId: "u1", node, prompt: "x" },
        { findVideo: async () => video(), stillBlocker: async () => "角色定裝圖正在產生，請稍候再試" },
      ),
      /角色定裝圖/,
    );
  });
});

describe("pollExplainerFrame", () => {
  const jobId = `${videoId.toHexString()}:2`;
  it("maps the start frame status", async () => {
    const at = (status: string, extra: object = {}) =>
      pollExplainerFrame(
        { clerkUserId: "u1", externalJobId: jobId },
        {
          findVideo: async () =>
            video([{ clipNumber: 2, position: "start", prompt: "p", status, ...extra } as never]),
        },
      );
    assert.deepEqual(await at("in_progress"), { status: "running" });
    assert.deepEqual(await at("completed", { blobUrl: "https://b/x.png" }), {
      status: "completed",
      outputUrl: "https://b/x.png",
    });
    assert.deepEqual(await at("failed", { error: "nsfw" }), { status: "failed", error: "nsfw" });
  });
});
