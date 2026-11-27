import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasEdge, CanvasJob, CanvasNode, CanvasNodeData, CanvasProject } from "@/model/canvas";
import { STYLE_IDS } from "@/model/style-id";
import { videoStyleOptions } from "@/app/app/canvas/nodes/video-style-options";
import { STATIC_CANVAS_MODELS, findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import {
  VIDEO_STYLE_TRANSFER_MODEL_ID,
  defaultVideoStyleTransferModel,
  videoStyleTransferModelChoices,
} from "@/service/canvas/catalog/video-style-transfer";
import { validateEdgeConnection } from "@/service/canvas/core/graph";
import type { CanvasExecutorDeps } from "@/service/canvas/execution/jobs/deps";
import { submitCanvasNodeJob } from "@/service/canvas/execution/executor";
import { validateScroToolInputs } from "@/service/canvas/execution/scro-dispatch";
import {
  planVideoStyleTransfer,
  videoStyleTransferPrompt,
} from "@/service/canvas/execution/video-style-transfer";
import { resolvedStyle } from "@/service/style/load-style";
import type { OpenRouterCanvasVideoInput } from "@/service/openrouter/generate";

const SOURCE_VIDEO = "https://cdn.example/source.mp4";
const EDIT_MODEL_ID = "openrouter:black-forest-labs/flux-video-edit";

function modelNode(id: string, modelId: string, extra?: Partial<CanvasNodeData>): CanvasNode {
  return { id, type: "model", position: { x: 0, y: 0 }, data: { modelId, ...extra } };
}

function transferNode(extra?: Partial<CanvasNodeData>): CanvasNode {
  return modelNode("transfer", VIDEO_STYLE_TRANSFER_MODEL_ID, {
    aspectRatio: "16:9",
    durationSeconds: 8,
    toolParams: { styleId: "watercolor", videoModelId: EDIT_MODEL_ID },
    ...extra,
  });
}

describe("video style transfer", () => {
  it("lists video models that can take a source video and defaults to a video-edit model", () => {
    const choices = videoStyleTransferModelChoices(STATIC_CANVAS_MODELS);
    assert.ok(choices.length > 0);
    assert.ok(choices.every((spec) => spec.category === "video"));
    assert.equal(choices.some((spec) => spec.provider === "google"), false);
    assert.equal(choices.some((spec) => spec.provider === "mentalok"), false);
    assert.equal(choices.some((spec) => /heygen|avatar/i.test(spec.id)), false);
    assert.equal(defaultVideoStyleTransferModel(STATIC_CANVAS_MODELS)?.id, EDIT_MODEL_ID);
    assert.ok(findCanvasModel(VIDEO_STYLE_TRANSFER_MODEL_ID)?.inputs.some((port) => port.type === "video" && port.required));
    assert.equal(findCanvasModel(VIDEO_STYLE_TRANSFER_MODEL_ID)?.output.type, "video");
  });

  it("accepts a video media node or any video-output node, and rejects an image", () => {
    const transfer = transferNode();
    const videoMedia: CanvasNode = {
      id: "clip",
      type: "media",
      position: { x: 0, y: 0 },
      data: { mediaKind: "video", mediaUrl: SOURCE_VIDEO },
    };
    const imageMedia: CanvasNode = {
      id: "still",
      type: "media",
      position: { x: 0, y: 0 },
      data: { mediaKind: "image", mediaUrl: "https://cdn.example/still.png" },
    };
    const hailuo = modelNode("hailuo", "openrouter:minimax/hailuo-3");
    const videoWire = {
      source: "clip",
      sourceHandle: "output",
      target: "transfer",
      targetHandle: "video",
    };
    assert.equal(validateEdgeConnection([videoMedia, transfer], [], videoWire).valid, true);
    assert.equal(
      validateEdgeConnection([hailuo, transfer], [], { ...videoWire, source: "hailuo" }).valid,
      true,
    );
    assert.equal(
      validateEdgeConnection([imageMedia, transfer], [], { ...videoWire, source: "still" }).valid,
      false,
    );
  });

  it("builds a style prompt and rejects a missing style, model, or video", () => {
    const style = resolvedStyle("watercolor");
    const prompt = videoStyleTransferPrompt(style);
    assert.match(prompt, new RegExp(style.name));
    assert.match(prompt, /Restyle the input video/);
    assert.match(prompt, /Keep the same subjects/);

    const planned = planVideoStyleTransfer({
      node: transferNode(),
      videoUrl: SOURCE_VIDEO,
      catalog: STATIC_CANVAS_MODELS,
    });
    assert.equal(planned.ok, true);
    if (planned.ok) {
      assert.equal(planned.plan.model.id, EDIT_MODEL_ID);
      assert.equal(planned.plan.videoUrl, SOURCE_VIDEO);
      assert.equal(planned.plan.styleId, "watercolor");
      assert.match(planned.plan.prompt, new RegExp(style.name));
      assert.equal(planned.plan.durationSeconds, 8);
    }

    const missingStyle = planVideoStyleTransfer({
      node: transferNode({ toolParams: { videoModelId: EDIT_MODEL_ID } }),
      videoUrl: SOURCE_VIDEO,
      catalog: STATIC_CANVAS_MODELS,
    });
    assert.equal(missingStyle.ok, false);
    if (!missingStyle.ok) assert.ok(missingStyle.missing.includes("styleId"));

    const rejected = validateScroToolInputs(
      VIDEO_STYLE_TRANSFER_MODEL_ID,
      transferNode({ toolParams: { styleId: "watercolor" } }),
      { refImages: [], videos: [], video: SOURCE_VIDEO },
    );
    assert.equal(rejected.ok, false);
    if (!rejected.ok) assert.ok(rejected.missingRequiredFields.includes("videoModelId"));
  });

  it("names every system style for the picker", () => {
    for (const isZh of [false, true]) {
      const options = videoStyleOptions(isZh);
      assert.deepEqual(
        options.map((style) => style.id),
        [...STYLE_IDS],
      );
      assert.ok(options.every((style) => style.label.trim().length > 0));
    }
  });

  it("charges the selected video model and submits that model with the style and input video", async () => {
    const now = new Date("2026-11-27T00:00:00.000Z");
    const project: CanvasProject = {
      _id: new ObjectId(),
      clerkUserId: "user_1",
      title: "Style transfer",
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: "clip",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "video", mediaUrl: SOURCE_VIDEO },
        },
        transferNode(),
      ],
      edges: [
        {
          id: "e1",
          source: "clip",
          sourceHandle: "output",
          target: "transfer",
          targetHandle: "video",
        },
      ] satisfies CanvasEdge[],
      createdAt: now,
      updatedAt: now,
    };
    const jobs = new Map<string, CanvasJob>();
    let wallet = 20;
    let submitted: OpenRouterCanvasVideoInput | undefined;
    const unused = async () => {
      throw new Error("unused canvas dep");
    };
    const deps: CanvasExecutorDeps = {
      findCanvasProject: async () => project,
      updateCanvasNodeState: async ({ nodeId, patch }) => {
        const node = project.nodes.find((item) => item.id === nodeId);
        if (!node) return;
        node.data = { ...node.data, ...patch };
      },
      insertCanvasJob: async (job) => {
        jobs.set(job._id.toHexString(), { ...job });
      },
      updateCanvasJob: async (jobId, clerkUserId, update) => {
        const existing = jobs.get(jobId.toHexString());
        if (!existing || existing.clerkUserId !== clerkUserId) return;
        jobs.set(jobId.toHexString(), { ...existing, ...(update.$set ?? {}) });
      },
      findCanvasJobsByIds: async () => [],
      findCompletedJobOutputs: async () => [],
      claimCanvasJobRefund: async () => null,
      getCatalog: async () => STATIC_CANVAS_MODELS.map((model) => ({ ...model })),
      hasMentalokKey: () => false,
      hasOpenRouterKey: () => true,
      hasMinimaxKey: () => false,
      hasGoogleStudioKey: () => false,
      consumeCreditUsd: async (_user, costUsd) => {
        wallet -= costUsd;
        return "spend-1";
      },
      refundCreditUsd: unused,
      getUserCreditUsd: async () => wallet,
      submitOpenRouterImage: unused,
      submitGoogleStudioImage: unused,
      submitGoogleStudioVideo: unused,
      fetchGoogleStudioVideo: unused,
      submitOpenRouterCanvasVideo: async (input) => {
        submitted = input;
        return {
          request_id: "or-style-1",
          status: "queued",
          status_url: "https://openrouter.ai/api/v1/videos/or-style-1",
        };
      },
      fetchOpenRouterStatus: unused,
      submitMinimaxCanvasImage: unused,
      submitMinimaxCanvasVideo: unused,
      fetchMinimaxCanvasVideo: unused,
      createMentalokJob: unused,
      getMentalokJob: unused,
      ensureMentalokUrl: async (url) => url,
      persistMedia: async (_url, pathname) => `https://blob.example/${pathname}`,
      executeScroSyncNode: unused,
      submitScroAsyncNode: unused,
      pollScroAsyncJob: async () => ({ status: "running" }),
      enqueueFfmpegWorkerTask: async () => new ObjectId(),
      findWorkerTaskStatus: async () => null,
      now: () => now,
    };

    const target = findCanvasModel(EDIT_MODEL_ID)!;
    const expectedUsd = estimateCanvasModelCostUsd(target, { durationSeconds: 8 });
    const result = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: project._id.toHexString(),
        nodeId: "transfer",
      },
      deps,
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.job.provider, "openrouter");
    assert.equal(result.job.modelId, EDIT_MODEL_ID);
    assert.equal(result.job.providerModelId, "black-forest-labs/flux-video-edit");
    assert.equal(result.job.chargedUsd, expectedUsd);
    assert.ok(expectedUsd > 0);
    assert.equal(submitted?.model, "black-forest-labs/flux-video-edit");
    assert.equal(submitted?.videoUrl, SOURCE_VIDEO);
    assert.equal(submitted?.durationSeconds, 8);
    assert.match(submitted?.prompt ?? "", /Watercolour storybook/);
    assert.match(submitted?.prompt ?? "", /Restyle the input video/);
    const stored = jobs.get(result.job._id.toHexString());
    assert.equal(stored?.modelId, EDIT_MODEL_ID);
    assert.equal(stored?.inputSnapshot.video, SOURCE_VIDEO);
    assert.equal(stored?.inputSnapshot.styleId, "watercolor");
    assert.equal(project.nodes.find((node) => node.id === "transfer")?.data.modelId, VIDEO_STYLE_TRANSFER_MODEL_ID);
  });
});
