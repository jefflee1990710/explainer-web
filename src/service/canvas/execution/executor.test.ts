import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasEdge, CanvasJob, CanvasNode, CanvasNodeData, CanvasProject } from "@/model/canvas";
import { findCanvasModel, STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import {
  type CanvasExecutorDeps,
  CANVAS_ASYNC_JOB_TIMEOUT_MS,
  CANVAS_IMAGE_JOB_TIMEOUT_MS,
  isCanvasJobTimedOut,
  pollCanvasJobs,
  refundCanvasJobOnce,
  dispatchQueuedCanvasJobById,
  submitCanvasNodeJob,
} from "@/service/canvas/execution/executor";
import { STYLE_TRANSFER_PROMPT } from "@/service/canvas/core/style-transfer";
import type { MentalokCreateJobPayload, MentalokJobRecord } from "@/service/mentalok/client";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";

type InMemoryHarness = {
  deps: CanvasExecutorDeps;
  project: CanvasProject;
  jobs: Map<string, CanvasJob>;
  wallet: { creditUsd: number };
  refundCalls: Array<{ clerkUserId: string; costUsd: number; spendEventKey?: string }>;
  consumeCalls: Array<{ clerkUserId: string; costUsd: number }>;
  persistedCalls: Array<{ url: string; pathname: string }>;
  mentalokPayloads: MentalokCreateJobPayload[];
};

function createHarness(options: {
  nodes: CanvasNode[];
  edges?: CanvasEdge[];
  initialCreditUsd?: number;
  hasMentalokKey?: boolean;
  hasOpenRouterKey?: boolean;
  overrides?: Partial<CanvasExecutorDeps>;
}): InMemoryHarness {
  const now = new Date("2026-11-20T00:00:00.000Z");
  const project: CanvasProject = {
    _id: new ObjectId(),
    clerkUserId: "user_1",
    title: "Test Canvas",
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: options.nodes.map((node) => ({ ...node, data: { ...node.data } })),
    edges: (options.edges ?? []).map((edge) => ({ ...edge })),
    createdAt: now,
    updatedAt: now,
  };

  const jobs = new Map<string, CanvasJob>();
  const wallet = { creditUsd: options.initialCreditUsd ?? 10 };
  const refundCalls: Array<{ clerkUserId: string; costUsd: number; spendEventKey?: string }> = [];
  const consumeCalls: Array<{ clerkUserId: string; costUsd: number }> = [];
  const persistedCalls: Array<{ url: string; pathname: string }> = [];
  const mentalokPayloads: MentalokCreateJobPayload[] = [];
  let spendSeq = 0;

  const baseDeps: CanvasExecutorDeps = {
    findCanvasProject: async (canvasId, clerkUserId) => {
      if (project._id.equals(canvasId) && project.clerkUserId === clerkUserId) {
        return {
          ...project,
          nodes: project.nodes.map((n) => ({ ...n, data: { ...n.data } })),
          edges: project.edges.map((e) => ({ ...e })),
        };
      }
      return null;
    },
    updateCanvasNodeState: async ({ canvasId, clerkUserId, nodeId, patch, thumbnailUrl, updatedAt }) => {
      if (!project._id.equals(canvasId) || project.clerkUserId !== clerkUserId) return;
      const target = project.nodes.find((node) => node.id === nodeId);
      if (target) {
        const nextData: CanvasNodeData = { ...target.data };
        for (const [key, value] of Object.entries(patch) as Array<[keyof CanvasNodeData, unknown]>) {
          if (value === undefined) {
            delete nextData[key];
          } else {
            (nextData as Record<string, unknown>)[key] = value;
          }
        }
        target.data = nextData;
      }
      if (thumbnailUrl) {
        project.thumbnailUrl = thumbnailUrl;
      }
      project.updatedAt = updatedAt;
    },
    insertCanvasJob: async (job) => {
      jobs.set(job._id.toHexString(), { ...job });
    },
    updateCanvasJob: async (jobId, clerkUserId, update) => {
      const existing = jobs.get(jobId.toHexString());
      if (!existing || existing.clerkUserId !== clerkUserId) return;
      const next = { ...existing, ...(update.$set ?? {}) };
      if (update.$unset) {
        for (const key of Object.keys(update.$unset) as Array<keyof CanvasJob>) {
          delete next[key];
        }
      }
      jobs.set(jobId.toHexString(), next);
    },
    findCanvasJobsByIds: async (canvasId, clerkUserId, jobIds) => {
      const found: CanvasJob[] = [];
      for (const id of jobIds) {
        const job = jobs.get(id.toHexString());
        if (job && job.canvasId.equals(canvasId) && job.clerkUserId === clerkUserId) {
          found.push({ ...job });
        }
      }
      return found;
    },
    findCompletedJobOutputs: async (canvasId, clerkUserId, nodeIds) => {
      const wanted = new Set(nodeIds);
      return [...jobs.values()].filter(
        (job) =>
          job.canvasId.equals(canvasId) &&
          job.clerkUserId === clerkUserId &&
          wanted.has(job.nodeId) &&
          job.status === "completed" &&
          Boolean(job.outputUrl?.trim()),
      );
    },
    claimCanvasJobRefund: async (jobId, clerkUserId, refundedAt) => {
      const existing = jobs.get(jobId.toHexString());
      if (!existing || existing.clerkUserId !== clerkUserId || existing.refundedAt) {
        return null;
      }
      const updated: CanvasJob = { ...existing, refundedAt, updatedAt: refundedAt };
      jobs.set(jobId.toHexString(), updated);
      return { ...updated };
    },
    getCatalog: async () => STATIC_CANVAS_MODELS.map((m) => ({ ...m })),
    hasMentalokKey: () => options.hasMentalokKey ?? true,
    hasOpenRouterKey: () => options.hasOpenRouterKey ?? true,
    hasMinimaxKey: () => true,
    hasGoogleStudioKey: () => true,
    consumeCreditUsd: async (clerkUserId, costUsd) => {
      consumeCalls.push({ clerkUserId, costUsd });
      if (wallet.creditUsd < costUsd) {
        throw new Error("USD Credit 餘額不足，無法扣款");
      }
      wallet.creditUsd = Number((wallet.creditUsd - costUsd).toFixed(4));
      spendSeq += 1;
      return `spend:${clerkUserId}:${spendSeq}`;
    },
    refundCreditUsd: async (clerkUserId, costUsd, spendEventKey) => {
      refundCalls.push({ clerkUserId, costUsd, spendEventKey });
      wallet.creditUsd = Number((wallet.creditUsd + costUsd).toFixed(4));
    },
    getUserCreditUsd: async () => wallet.creditUsd,
    submitOpenRouterImage: async (): Promise<GenerationSubmitResult> => ({
      request_id: "or-img-1",
      status: "completed",
      images: [{ url: "data:image/png;base64,aGVsbG8=" }],
    }),
    submitGoogleStudioImage: async (): Promise<GenerationSubmitResult> => ({
      request_id: "google-img-1",
      status: "completed",
      images: [{ url: "data:image/png;base64,Z29vZ2xl" }],
    }),
    submitGoogleStudioVideo: async (): Promise<GenerationSubmitResult> => ({
      request_id: "google-vid-1",
      status: "in_progress",
      status_url: "https://generativelanguage.googleapis.com/v1beta/interactions/google-vid-1",
    }),
    fetchGoogleStudioVideo: async (): Promise<GenerationSubmitResult> => ({
      request_id: "google-vid-1",
      status: "completed",
      video: { url: "data:video/mp4;base64,AAAA" },
    }),
    submitOpenRouterCanvasVideo: async (): Promise<GenerationSubmitResult> => ({
      request_id: "or-vid-1",
      status_url: "https://openrouter.ai/api/v1/videos/or-vid-1",
      status: "queued",
    }),
    fetchOpenRouterStatus: async (): Promise<GenerationSubmitResult> => ({
      request_id: "or-vid-1",
      status_url: "https://openrouter.ai/api/v1/videos/or-vid-1",
      status: "completed",
      video: { url: "https://openrouter.ai/api/v1/videos/or-vid-1/content?index=0" },
    }),
    submitMinimaxCanvasImage: async (): Promise<GenerationSubmitResult> => ({
      request_id: "mm-img-1",
      status: "completed",
      images: [{ url: "https://cdn.minimax.io/image.jpg" }],
    }),
    submitMinimaxCanvasVideo: async (): Promise<GenerationSubmitResult> => ({
      request_id: "mm-vid-1",
      status_url: "https://api.minimax.io/v2/query/video_generation/mm-vid-1",
      status: "queued",
    }),
    fetchMinimaxCanvasVideo: async (): Promise<GenerationSubmitResult> => ({
      request_id: "mm-vid-1",
      status_url: "https://api.minimax.io/v2/query/video_generation/mm-vid-1",
      status: "completed",
      video: { url: "https://cdn.minimax.io/mm-vid-1.mp4" },
    }),
    createMentalokJob: async (payload): Promise<MentalokJobRecord> => {
      mentalokPayloads.push(payload);
      return { id: "mtk-job-1", status: "queued", modelId: payload.modelId };
    },
    getMentalokJob: async (jobId): Promise<MentalokJobRecord> => ({
      id: jobId,
      status: "completed",
      outputUrl: "https://signed.mentalok.io/temp-output.mp4?sig=expiring",
    }),
    ensureMentalokUrl: async (url) =>
      url.startsWith("data:") ? "https://uploads.mentalok.io/bridged.png" : url,
    persistMedia: async (url, pathname) => {
      persistedCalls.push({ url, pathname });
      return `https://blob.vercel-storage.com/${pathname}`;
    },
    executeScroSyncNode: async () => ({
      outputUrl: "https://blob.example/scro-sync.png",
      outputKind: "image",
    }),
    submitScroAsyncNode: async () => ({
      domainKind: "video",
      externalJobId: new ObjectId().toHexString(),
    }),
    pollScroAsyncJob: async () => ({ status: "running" }),
    enqueueFfmpegWorkerTask: async () => new ObjectId(),
    findWorkerTaskStatus: async () => ({ status: "in_progress" }),
    now: () => new Date("2026-11-20T00:01:00.000Z"),
    ...options.overrides,
  };

  return {
    deps: baseDeps,
    project,
    jobs,
    wallet,
    refundCalls,
    consumeCalls,
    persistedCalls,
    mentalokPayloads,
  };
}

describe("canvas executor", () => {
  it("returns INSUFFICIENT_CREDIT without calling provider when consumeCreditUsd throws insufficient balance", async () => {
    let providerCalled = false;
    const harness = createHarness({
      initialCreditUsd: 0.05,
      nodes: [
        {
          id: "n1",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
            prompt: "Golden hour street photography",
            aspectRatio: "16:9",
          },
        },
      ],
      overrides: {
        submitOpenRouterImage: async () => {
          providerCalled = true;
          throw new Error("should not be called");
        },
      },
    });

    const result = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "n1",
      },
      harness.deps,
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "INSUFFICIENT_CREDIT");
      assert.equal(result.requiredUsd, 0.0675);
      assert.equal(result.availableUsd, 0.05);
      assert.equal(result.creditUsd, 0.05);
    }
    assert.equal(providerCalled, false);
    assert.equal(harness.jobs.size, 0);
    assert.equal(harness.refundCalls.length, 0);
  });

  it("submits OpenRouter image synchronously, persists to Blob, updates node outputUrl & thumbnailUrl, and keeps chargedUsd", async () => {
    const harness = createHarness({
      initialCreditUsd: 1.0,
      nodes: [
        {
          id: "img-node",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
            prompt: "Studio product shot of a ceramic mug",
            aspectRatio: "1:1",
            resolution: "2k",
          },
        },
      ],
    });

    const result = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "img-node",
      },
      harness.deps,
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.job.status, "completed");
      assert.equal(result.job.chargedUsd, 0.135);
      assert.equal(result.job.outputKind, "image");
      assert.match(result.job.outputUrl || "", /^https:\/\/blob\.vercel-storage\.com\/canvas\/user_1\/.+\.png$/);
      assert.equal(result.creditUsd, 0.865);
    }
    assert.equal(harness.persistedCalls.length, 1);
    assert.equal(harness.persistedCalls[0]?.url, "data:image/png;base64,aGVsbG8=");
    assert.equal(harness.refundCalls.length, 0);

    const updatedNode = harness.project.nodes.find((n) => n.id === "img-node");
    assert.equal(updatedNode?.data.status, "completed");
    assert.equal(updatedNode?.data.outputKind, "image");
    assert.equal(updatedNode?.data.lastCostUsd, 0.135);
    assert.equal(updatedNode?.data.outputUrl, harness.project.thumbnailUrl);
  });

  it("sends a Nano Banana 2.1 node to Google AI Studio with its wired reference images in order", async () => {
    const calls: Array<{ model: string; prompt: string; referenceImageUrls?: Array<string | undefined> }> = [];
    let openRouterCalled = false;
    const harness = createHarness({
      initialCreditUsd: 1.0,
      nodes: [
        { id: "ref-a", type: "media", position: { x: 0, y: 0 }, data: { mediaKind: "image", mediaUrl: "https://blob.vercel-storage.com/a.png" } },
        { id: "ref-b", type: "media", position: { x: 0, y: 0 }, data: { mediaKind: "image", mediaUrl: "https://blob.vercel-storage.com/b.png" } },
        {
          id: "nb",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "google:gemini-nano-banana-2.1", prompt: "Whiteboard still", aspectRatio: "9:16" },
        },
      ],
      edges: [
        { id: "e1", source: "ref-a", sourceHandle: "output", target: "nb", targetHandle: "refImages" },
        { id: "e2", source: "ref-b", sourceHandle: "output", target: "nb", targetHandle: "refImages" },
      ],
      overrides: {
        submitGoogleStudioImage: async (input) => {
          calls.push(input);
          return { request_id: "g1", status: "completed", images: [{ url: "data:image/png;base64,Z29vZ2xl" }] };
        },
        submitOpenRouterImage: async () => {
          openRouterCalled = true;
          throw new Error("should not be called");
        },
      },
    });

    const result = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "nb" },
      harness.deps,
    );

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.job.chargedUsd, 0.0504);
    assert.equal(openRouterCalled, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.model, "gemini-nano-banana-2.1");
    assert.equal(calls[0]?.prompt, "Whiteboard still");
    assert.deepEqual(calls[0]?.referenceImageUrls, [
      "https://blob.vercel-storage.com/a.png",
      "https://blob.vercel-storage.com/b.png",
    ]);
  });

  it("submits Mentalok video asynchronously with mapped keyframes/refAudio/refImages, then polls and persists expiring URL to Blob", async () => {
    const harness = createHarness({
      initialCreditUsd: 2.0,
      nodes: [
        {
          id: "start-media",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "image", mediaUrl: "data:image/png;base64,c3RhcnQ=" },
        },
        {
          id: "end-media",
          type: "media",
          position: { x: 0, y: 100 },
          data: { mediaKind: "image", mediaUrl: "https://blob.vercel-storage.com/end.png" },
        },
        {
          id: "audio-media",
          type: "media",
          position: { x: 0, y: 200 },
          data: { mediaKind: "audio", mediaUrl: "https://blob.vercel-storage.com/voice.mp3" },
        },
        {
          id: "ref-media",
          type: "media",
          position: { x: 0, y: 300 },
          data: { mediaKind: "image", mediaUrl: "https://blob.vercel-storage.com/char.png" },
        },
        {
          id: "vid-node",
          type: "model",
          position: { x: 300, y: 0 },
          data: {
            modelId: "mentalok:minimax-h3-ref2va",
            presetId: "h3-ref2va-768p",
            prompt: "Character walks forward speaking calmly",
          },
        },
      ],
      edges: [
        { id: "e1", source: "start-media", sourceHandle: "output", target: "vid-node", targetHandle: "startImage" },
        { id: "e2", source: "end-media", sourceHandle: "output", target: "vid-node", targetHandle: "endImage" },
        { id: "e3", source: "audio-media", sourceHandle: "output", target: "vid-node", targetHandle: "refAudio" },
        { id: "e4", source: "ref-media", sourceHandle: "output", target: "vid-node", targetHandle: "refImages" },
      ],
    });

    const submitted = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "vid-node",
      },
      harness.deps,
    );

    assert.equal(submitted.ok, true);
    if (!submitted.ok) return;

    assert.equal(submitted.job.status, "running");
    assert.equal(submitted.job.externalJobId, "mtk-job-1");
    assert.equal(submitted.job.chargedUsd, 0.315); // 0.21 * 1.5
    assert.equal(submitted.creditUsd, 1.685);

    // Verify Mentalok payload mapped data: startImage via ensureMentalokUrl, keyframes, refAudioUrl, refImages.
    assert.equal(harness.mentalokPayloads.length, 1);
    assert.deepEqual(harness.mentalokPayloads[0]?.keyframes, {
      startImage: "https://uploads.mentalok.io/bridged.png",
      endImage: "https://blob.vercel-storage.com/end.png",
    });
    assert.equal(harness.mentalokPayloads[0]?.refAudioUrl, "https://blob.vercel-storage.com/voice.mp3");
    assert.deepEqual(harness.mentalokPayloads[0]?.refImages, ["https://blob.vercel-storage.com/char.png"]);

    const polled = await pollCanvasJobs(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        jobIds: [submitted.job._id.toHexString()],
      },
      harness.deps,
    );

    assert.equal(polled.jobs.length, 1);
    assert.equal(polled.jobs[0]?.status, "completed");
    assert.equal(polled.jobs[0]?.outputKind, "video");
    assert.match(polled.jobs[0]?.outputUrl || "", /^https:\/\/blob\.vercel-storage\.com\/canvas\/user_1\/.+\.mp4$/);
    assert.equal(harness.persistedCalls.length, 1);
    assert.equal(harness.persistedCalls[0]?.url, "https://signed.mentalok.io/temp-output.mp4?sig=expiring");

    const updatedNode = harness.project.nodes.find((n) => n.id === "vid-node");
    assert.equal(updatedNode?.data.status, "completed");
    assert.equal(updatedNode?.data.outputUrl, polled.jobs[0]?.outputUrl);
    assert.equal(harness.refundCalls.length, 0);
  });

  it("maps single-frame Mentalok TI2V startImage to imageUrl instead of keyframes", async () => {
    const harness = createHarness({
      initialCreditUsd: 1.0,
      nodes: [
        {
          id: "start-img",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "image", mediaUrl: "https://blob.vercel-storage.com/frame.png" },
        },
        {
          id: "wan-node",
          type: "model",
          position: { x: 300, y: 0 },
          data: {
            modelId: "mentalok:wan-2-2",
            prompt: "Gentle wind blowing through trees",
          },
        },
      ],
      edges: [
        { id: "e1", source: "start-img", sourceHandle: "output", target: "wan-node", targetHandle: "startImage" },
      ],
    });

    const submitted = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "wan-node",
      },
      harness.deps,
    );

    assert.equal(submitted.ok, true);
    assert.equal(harness.mentalokPayloads[0]?.imageUrl, "https://blob.vercel-storage.com/frame.png");
    assert.equal(harness.mentalokPayloads[0]?.keyframes, undefined);
  });

  it("refunds exactly once with spendEventKey and marks job failed when provider submission throws", async () => {
    const harness = createHarness({
      initialCreditUsd: 1.0,
      nodes: [
        {
          id: "err-node",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
            prompt: "Fail during submit",
          },
        },
      ],
      overrides: {
        submitOpenRouterImage: async () => {
          throw new Error("OpenRouter 503 upstream timeout");
        },
      },
    });

    const result = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "err-node",
      },
      harness.deps,
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "PROVIDER_ERROR");
      assert.match(result.error, /503 upstream timeout/);
      assert.equal(result.creditUsd, 1.0);
      assert.equal(result.job?.status, "failed");
    }
    assert.equal(harness.consumeCalls.length, 1);
    assert.equal(harness.refundCalls.length, 1);
    assert.equal(harness.refundCalls[0]?.costUsd, 0.0675);
    assert.equal(harness.refundCalls[0]?.spendEventKey, "spend:user_1:1");
    assert.equal(harness.wallet.creditUsd, 1.0);

    const updatedNode = harness.project.nodes.find((n) => n.id === "err-node");
    assert.equal(updatedNode?.data.status, "failed");
    assert.match(updatedNode?.data.lastError || "", /503 upstream timeout/);
  });

  it("refunds exactly once on provider polling failure and never double-refunds on repeated or concurrent polls", async () => {
    const harness = createHarness({
      initialCreditUsd: 1.0,
      nodes: [
        {
          id: "vid-node",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "mentalok:wan-2-1",
            prompt: "Will fail remotely",
          },
        },
      ],
      overrides: {
        getMentalokJob: async (jobId) => ({
          id: jobId,
          status: "failed",
          error: "GPU OOM on worker",
        }),
      },
    });

    const submitted = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "vid-node",
      },
      harness.deps,
    );
    assert.equal(submitted.ok, true);
    if (!submitted.ok) return;

    const jobId = submitted.job._id.toHexString();
    assert.equal(harness.wallet.creditUsd, 0.88); // 1.0 - (0.08 * 1.5)

    // First poll sees remote failure -> refunds once.
    const poll1 = await pollCanvasJobs(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        jobIds: [jobId],
      },
      harness.deps,
    );
    assert.equal(poll1.jobs[0]?.status, "failed");
    assert.equal(poll1.jobs[0]?.error, "GPU OOM on worker");
    assert.equal(poll1.creditUsd, 1.0);
    assert.equal(harness.refundCalls.length, 1);

    // Second poll of the same failed job must NOT refund again.
    const poll2 = await pollCanvasJobs(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        jobIds: [jobId],
      },
      harness.deps,
    );
    assert.equal(poll2.jobs[0]?.status, "failed");
    assert.equal(poll2.creditUsd, 1.0);
    assert.equal(harness.refundCalls.length, 1);

    // Direct concurrent calls to refundCanvasJobOnce must also be strictly idempotent.
    const [r1, r2] = await Promise.all([
      refundCanvasJobOnce(jobId, "user_1", harness.deps),
      refundCanvasJobOnce(jobId, "user_1", harness.deps),
    ]);
    assert.equal(r1.refunded, false);
    assert.equal(r2.refunded, false);
    assert.equal(harness.refundCalls.length, 1);
    assert.equal(harness.wallet.creditUsd, 1.0);
  });

  it("keeps job running on transient persistMedia failure during poll and succeeds on next poll without double-charging", async () => {
    let persistAttempts = 0;
    const harness = createHarness({
      initialCreditUsd: 1.0,
      nodes: [
        {
          id: "or-vid",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "openrouter:minimax/hailuo-3",
            prompt: "Ocean waves at sunset",
            durationSeconds: 5,
          },
        },
      ],
      overrides: {
        persistMedia: async (url, pathname) => {
          persistAttempts += 1;
          if (persistAttempts === 1) {
            throw new Error("Transient Vercel Blob 503");
          }
          return `https://blob.vercel-storage.com/${pathname}`;
        },
      },
    });

    const submitted = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "or-vid",
      },
      harness.deps,
    );
    assert.equal(submitted.ok, true);
    if (!submitted.ok) return;
    assert.equal(submitted.job.provider, "minimax");
    assert.match(submitted.job.statusUrl || "", /^https:\/\/api\.minimax\.io\//);

    const jobId = submitted.job._id.toHexString();
    // First poll hits transient Blob error -> stays running, no refund.
    const poll1 = await pollCanvasJobs(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        jobIds: [jobId],
      },
      harness.deps,
    );
    assert.equal(poll1.jobs[0]?.status, "running");
    assert.equal(harness.refundCalls.length, 0);
    assert.equal(harness.consumeCalls.length, 1);

    // Second poll succeeds and persists permanently.
    const poll2 = await pollCanvasJobs(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        jobIds: [jobId],
      },
      harness.deps,
    );
    assert.equal(poll2.jobs[0]?.status, "completed");
    assert.match(poll2.jobs[0]?.outputUrl || "", /^https:\/\/blob\.vercel-storage\.com\/canvas\/user_1\/.+\.mp4$/);
    assert.equal(harness.refundCalls.length, 0);
    assert.equal(harness.consumeCalls.length, 1);
  });

  it("rejects Mentalok execution cleanly before charging when MENTALOK_AI_STUDIO_API_KEY is missing", async () => {
    const harness = createHarness({
      initialCreditUsd: 5.0,
      hasMentalokKey: false,
      nodes: [
        {
          id: "flux-node",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "mentalok:flux-schnell",
            prompt: "Minimalist chair",
          },
        },
      ],
    });

    const result = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "flux-node",
      },
      harness.deps,
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "PROVIDER_UNAVAILABLE");
    }
    assert.equal(harness.consumeCalls.length, 0);
    assert.equal(harness.wallet.creditUsd, 5.0);
  });

  it("runs a downstream video from a completed upstream job when the node outputUrl was wiped", async () => {
    const harness = createHarness({
      initialCreditUsd: 5,
      nodes: [
        {
          id: "img",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "mentalok:flux-2-klein-4b", status: "idle" },
        },
        {
          id: "vid",
          type: "model",
          position: { x: 280, y: 0 },
          data: {
            modelId: "mentalok:wan-2-2",
            prompt: "Slow cinematic dolly-in",
            presetId: "wan22-portrait",
          },
        },
      ],
      edges: [
        {
          id: "e-img-vid",
          source: "img",
          sourceHandle: "output",
          target: "vid",
          targetHandle: "startImage",
        },
      ],
    });
    const finishedAt = new Date("2026-11-20T00:00:30.000Z");
    harness.jobs.set("job-img", {
      _id: new ObjectId(),
      clerkUserId: "user_1",
      canvasId: harness.project._id,
      nodeId: "img",
      provider: "mentalok",
      modelId: "mentalok:flux-2-klein-4b",
      providerModelId: "flux-2-klein-4b",
      status: "completed",
      inputSnapshot: {},
      chargedUsd: 0.005,
      outputUrl: "https://blob.example/flux.png",
      outputKind: "image",
      createdAt: new Date("2026-11-20T00:00:00.000Z"),
      updatedAt: finishedAt,
    });

    const result = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "vid",
      },
      harness.deps,
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      harness.mentalokPayloads[0]?.imageUrl,
      "https://blob.example/flux.png",
    );
    assert.equal(
      harness.project.nodes.find((node) => node.id === "img")?.data.outputUrl,
      "https://blob.example/flux.png",
    );
    assert.equal(
      harness.project.nodes.find((node) => node.id === "img")?.data.status,
      "completed",
    );
  });

  it("prices and submits a swap render with its own length", async () => {
    const harness = createHarness({
      initialCreditUsd: 100,
      overrides: { enqueueCanvasNodeWorkerTask: async () => {} },
      nodes: [
        { id: "src", type: "media", position: { x: 0, y: 0 }, data: { mediaKind: "video", mediaUrl: "https://x/v.mp4" } },
        {
          id: "r",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "scro:swap-render",
            durationSeconds: 10,
            aspectRatio: "9:16",
            prompt: "",
            toolParams: { swapMode: "character" },
          },
        },
      ],
      edges: [
        { id: "e1", source: "src", sourceHandle: "output", target: "r", targetHandle: "video" },
      ],
    });
    const result = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "r", queueToWorker: true },
      harness.deps,
    );
    assert.equal(result.ok, true, JSON.stringify(result));
    const job = [...harness.jobs.values()][0]!;
    assert.equal(job.inputSnapshot?.durationSeconds, 10);
    const spec = findCanvasModel("scro:swap-render")!;
    assert.notEqual(estimateCanvasModelCostUsd(spec, { durationSeconds: 4 }), estimateCanvasModelCostUsd(spec, { durationSeconds: 10 }));
    assert.deepEqual(harness.consumeCalls.map((c) => c.costUsd), [estimateCanvasModelCostUsd(spec, { durationSeconds: 10 })]);
  });

  it("skips consumeCreditUsd for $0 ffmpeg:concat, enqueues canvas_ffmpeg worker task, and polls completion", async () => {
    const workerTaskId = new ObjectId();
    let enqueuedKind = "";
    const harness = createHarness({
      initialCreditUsd: 1,
      nodes: [
        {
          id: "v1",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "video", mediaUrl: "https://blob.example/a.mp4" },
        },
        {
          id: "v2",
          type: "media",
          position: { x: 0, y: 120 },
          data: { mediaKind: "video", mediaUrl: "https://blob.example/b.mp4" },
        },
        {
          id: "concat",
          type: "model",
          position: { x: 300, y: 0 },
          data: { modelId: "ffmpeg:concat", presetId: "pad-200ms" },
        },
      ],
      edges: [
        { id: "e1", source: "v1", sourceHandle: "output", target: "concat", targetHandle: "videos" },
        { id: "e2", source: "v2", sourceHandle: "output", target: "concat", targetHandle: "videos" },
      ],
      overrides: {
        enqueueFfmpegWorkerTask: async ({ jobIdHex }) => {
          enqueuedKind = `canvas_ffmpeg:${jobIdHex}`;
          return workerTaskId;
        },
        findWorkerTaskStatus: async () => ({ status: "completed" }),
      } as Partial<CanvasExecutorDeps>,
    });

    const submitted = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "concat",
      },
      harness.deps,
    );
    assert.equal(submitted.ok, true);
    if (!submitted.ok) return;
    assert.equal(harness.consumeCalls.length, 0);
    assert.equal(harness.wallet.creditUsd, 1);
    assert.match(enqueuedKind, /^canvas_ffmpeg:/);
    assert.equal(submitted.job.domainKind, "worker_ffmpeg");

    // Simulate worker updating canvas_jobs outputUrl
    const stored = harness.jobs.get(submitted.job._id.toHexString())!;
    stored.status = "completed";
    stored.outputUrl = "https://blob.example/concat.mp4";
    stored.outputKind = "video";

    const polled = await pollCanvasJobs(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        jobIds: [submitted.job._id.toHexString()],
      },
      harness.deps,
    );
    assert.equal(polled.jobs[0]?.status, "completed");
    assert.equal(polled.jobs[0]?.outputUrl, "https://blob.example/concat.mp4");
  });

  it("charges $0.02 for scro:tts synchronously and outputs audio kind", async () => {
    const harness = createHarness({
      initialCreditUsd: 1,
      nodes: [
        {
          id: "tts",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "scro:tts", prompt: "大家好，歡迎來到 Scro" },
        },
      ],
      overrides: {
        executeScroSyncNode: async () => ({
          outputUrl: "https://blob.example/canvas/user_1/tts.mp3",
          outputKind: "audio",
        }),
      } as Partial<CanvasExecutorDeps>,
    });

    const res = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "tts",
      },
      harness.deps,
    );
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.job.status, "completed");
    assert.equal(res.job.outputKind, "audio");
    assert.equal(res.creditUsd, 0.98);
    assert.equal(harness.project.nodes[0]?.data.outputKind, "audio");
  });

  it("rejects scro:talking-head without startImage or characterId before charging", async () => {
    const harness = createHarness({
      initialCreditUsd: 5,
      nodes: [
        {
          id: "th",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "scro:talking-head", prompt: "Hello world" },
        },
      ],
    });

    const res = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "th",
      },
      harness.deps,
    );
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "INVALID_INPUTS");
    assert.equal(harness.consumeCalls.length, 0);
  });

  it("dispatches scro:explainer asynchronously, polls domain job, and refunds once on failure", async () => {
    let pollStage: "running" | "failed" = "running";
    const domainId = new ObjectId().toHexString();
    const harness = createHarness({
      initialCreditUsd: 10,
      nodes: [
        {
          id: "exp",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "scro:explainer", prompt: "Explain compound interest", durationSeconds: 30 },
        },
      ],
      overrides: {
        submitScroAsyncNode: async () => ({
          domainKind: "video",
          externalJobId: domainId,
        }),
        pollScroAsyncJob: async () =>
          pollStage === "running"
            ? { status: "running" }
            : { status: "failed", error: "Phase A failed" },
      } as Partial<CanvasExecutorDeps>,
    });

    const res = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "exp",
      },
      harness.deps,
    );
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.job.status, "running");
    assert.equal(res.job.domainKind, "video");
    assert.equal(harness.wallet.creditUsd, 3.898); // 10 - 6.102

    pollStage = "failed";
    const polled = await pollCanvasJobs(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        jobIds: [res.job._id.toHexString()],
      },
      harness.deps,
    );
    assert.equal(polled.jobs[0]?.status, "failed");
    assert.equal(polled.creditUsd, 10);
    assert.equal(harness.refundCalls.length, 1);
  });

  it("probes refAudio duration for scro:talking-head billing and stores duration in snapshot", async () => {
    const harness = createHarness({
      initialCreditUsd: 20,
      nodes: [
        {
          id: "aud",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "audio", mediaUrl: "https://blob.example/speech.mp3" },
        },
        {
          id: "th",
          type: "model",
          position: { x: 300, y: 0 },
          data: {
            modelId: "scro:talking-head",
            toolParams: { characterId: "char-1" },
          },
        },
      ],
      edges: [
        { id: "e1", source: "aud", sourceHandle: "output", target: "th", targetHandle: "refAudio" },
      ],
      overrides: {
        probeAudioDurationSec: async () => 25,
        submitScroAsyncNode: async () => ({
          domainKind: "video",
          externalJobId: new ObjectId().toHexString(),
        }),
      } as Partial<CanvasExecutorDeps>,
    });

    const res = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "th",
      },
      harness.deps,
    );
    assert.equal(res.ok, true);
    if (!res.ok) return;
    // 25s * $0.075/s = $1.875
    assert.equal(res.job.chargedUsd, 1.875);
    assert.equal(res.job.inputSnapshot.durationSeconds, 25);
  });

  it("sizes HeyGen Avatar IV to the wired voice for both price and submit", async () => {
    const submitted: Array<{ durationSeconds?: number }> = [];
    const harness = createHarness({
      initialCreditUsd: 50,
      nodes: [
        {
          id: "img",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "image", mediaUrl: "https://blob.example/face.png" },
        },
        {
          id: "aud",
          type: "media",
          position: { x: 0, y: 300 },
          data: { mediaKind: "audio", mediaUrl: "https://blob.example/speech.mp3" },
        },
        {
          id: "hg",
          type: "model",
          position: { x: 300, y: 0 },
          data: { modelId: "openrouter:heygen/avatar-iv", durationSeconds: 5 },
        },
      ],
      edges: [
        { id: "e1", source: "img", sourceHandle: "output", target: "hg", targetHandle: "startImage" },
        { id: "e2", source: "aud", sourceHandle: "output", target: "hg", targetHandle: "refAudio" },
      ],
      overrides: {
        probeAudioDurationSec: async () => 89.2,
        submitOpenRouterCanvasVideo: async (input: { durationSeconds?: number }) => {
          submitted.push(input);
          return {
            request_id: "or-vid-1",
            status_url: "https://openrouter.ai/api/v1/videos/or-vid-1",
            status: "queued",
          };
        },
      } as Partial<CanvasExecutorDeps>,
    });

    const res = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "hg" },
      harness.deps,
    );
    assert.equal(res.ok, true);
    if (!res.ok) return;
    // 90s * $0.075/s = $6.75
    assert.equal(res.job.chargedUsd, 6.75);
    assert.equal(submitted[0]?.durationSeconds, 90);
  });

  it("uses toolParams.durationPreset for scro:explainer billing even when node.data.durationSeconds is stale", async () => {
    const harness = createHarness({
      initialCreditUsd: 20,
      nodes: [
        {
          id: "exp",
          type: "model",
          position: { x: 0, y: 0 },
          data: {
            modelId: "scro:explainer",
            prompt: "Explain inflation",
            durationSeconds: 30,
            toolParams: { durationPreset: "60s" },
          },
        },
      ],
      overrides: {
        submitScroAsyncNode: async () => ({
          domainKind: "video",
          externalJobId: new ObjectId().toHexString(),
        }),
      } as Partial<CanvasExecutorDeps>,
    });

    const res = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "exp",
      },
      harness.deps,
    );
    assert.equal(res.ok, true);
    if (!res.ok) return;
    // 60s = 9 Nano Banana 1K stills * $0.0504 + 60 * $0.195 = $12.1536
    assert.equal(res.job.chargedUsd, 12.1536);
  });

  it("rejects running a planner node directly", async () => {
    const harness = createHarness({
      initialCreditUsd: 20,
      nodes: [
        {
          id: "exp",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "scro:explainer", prompt: "Explain inflation", toolParams: { plannerMode: true } },
        },
      ],
    });
    const res = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "exp" },
      harness.deps,
    );
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.code, "INVALID_INPUTS");
    assert.equal(harness.wallet.creditUsd, 20);
    assert.equal(harness.jobs.size, 0);
  });

  it("rejects style transfer until an image model is chosen", async () => {
    let called = false;
    const harness = createHarness({
      nodes: [
        {
          id: "photo",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "image", mediaUrl: "https://blob.example/photo.png" },
        },
        {
          id: "style",
          type: "model",
          position: { x: 40, y: 0 },
          data: { modelId: "scro:style-transfer", presetId: "9:16", status: "idle" },
        },
      ],
      edges: [
        { id: "e1", source: "photo", sourceHandle: "output", target: "style", targetHandle: "image" },
      ],
      overrides: {
        submitGoogleStudioImage: async () => {
          called = true;
          throw new Error("should not be called");
        },
      },
    });
    const result = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "style" },
      harness.deps,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "INVALID_INPUTS");
      assert.match(result.error, /圖片模型/);
    }
    assert.equal(called, false);
    assert.equal(harness.jobs.size, 0);
    assert.equal(harness.wallet.creditUsd, 10);
  });

  it("runs style transfer from a character image through the chosen Google image job", async () => {
    const calls: Array<{ model: string; prompt: string; aspectRatio?: string; referenceImageUrls?: Array<string | undefined> }> = [];
    const harness = createHarness({
      nodes: [
        {
          id: "hero",
          type: "character",
          position: { x: 0, y: 0 },
          data: { characterId: "c1", mediaKind: "image", mediaUrl: "https://blob.example/hero.png" },
        },
        {
          id: "style",
          type: "model",
          position: { x: 40, y: 0 },
          data: {
            modelId: "scro:style-transfer",
            presetId: "9:16",
            status: "idle",
            toolParams: { imageModelId: "google:gemini-nano-banana-2.1" },
          },
        },
      ],
      edges: [
        { id: "e1", source: "hero", sourceHandle: "output", target: "style", targetHandle: "image" },
      ],
      overrides: {
        submitGoogleStudioImage: async (input) => {
          calls.push(input);
          return { request_id: "g-style", status: "completed", images: [{ url: "data:image/png;base64,Z29vZ2xl" }] };
        },
        submitOpenRouterImage: async () => {
          throw new Error("openrouter should not run");
        },
      },
    });
    const result = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "style" },
      harness.deps,
    );
    const google = findCanvasModel("google:gemini-nano-banana-2.1")!;
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.job.modelId, "google:gemini-nano-banana-2.1");
      assert.equal(result.job.provider, "google");
      assert.equal(result.job.providerModelId, "gemini-nano-banana-2.1");
      assert.equal(result.job.outputKind, "image");
      assert.equal(
        result.job.chargedUsd,
        estimateCanvasModelCostUsd(google, { referenceImages: 1 }),
      );
      assert.equal(result.job.status, "completed");
    }
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.model, "gemini-nano-banana-2.1");
    assert.equal(calls[0]?.prompt, STYLE_TRANSFER_PROMPT);
    assert.equal(calls[0]?.aspectRatio, "9:16");
    assert.deepEqual(calls[0]?.referenceImageUrls, ["https://blob.example/hero.png"]);
    const node = harness.project.nodes.find((item) => item.id === "style");
    assert.equal(node?.data.modelId, "scro:style-transfer");
    assert.match(node?.data.outputUrl ?? "", /^https:\/\/blob\.vercel-storage\.com\/canvas\/user_1\//);
  });

  it("queues style transfer as the chosen OpenRouter image job, then the worker sends that input", async () => {
    const calls: Array<{ model: string; prompt: string; referenceImageUrls?: Array<string | undefined> }> = [];
    const harness = createHarness({
      overrides: { enqueueCanvasNodeWorkerTask: async () => {} },
      nodes: [
        {
          id: "photo",
          type: "media",
          position: { x: 0, y: 0 },
          data: { mediaKind: "image", mediaUrl: "https://blob.example/photo.png" },
        },
        {
          id: "still",
          type: "model",
          position: { x: 20, y: 0 },
          data: {
            modelId: "ffmpeg:frame-grab",
            outputUrl: "https://blob.example/frame.png",
            outputKind: "image",
            status: "completed",
          },
        },
        {
          id: "style",
          type: "model",
          position: { x: 80, y: 0 },
          data: {
            modelId: "scro:style-transfer",
            presetId: "1:1",
            status: "idle",
            toolParams: { imageModelId: "openrouter:bytedance-seed/seedream-5-0-pro" },
          },
        },
      ],
      edges: [
        { id: "e1", source: "still", sourceHandle: "output", target: "style", targetHandle: "image" },
      ],
    });
    harness.deps.findCanvasJobById = async (jobId) => harness.jobs.get(jobId.toHexString()) ?? null;
    harness.deps.submitOpenRouterImage = async (input) => {
      calls.push(input);
      return { request_id: "or-style", status: "completed", images: [{ url: "data:image/png;base64,aGVsbG8=" }] };
    };

    const queued = await submitCanvasNodeJob(
      {
        clerkUserId: "user_1",
        canvasId: harness.project._id.toHexString(),
        nodeId: "style",
        queueToWorker: true,
      },
      harness.deps,
    );
    assert.equal(queued.ok, true);
    if (!queued.ok) return;
    assert.equal(calls.length, 0);
    assert.equal(queued.job.modelId, "openrouter:bytedance-seed/seedream-5-0-pro");
    assert.equal(queued.job.provider, "openrouter");
    assert.equal(queued.job.status, "queued");
    assert.equal(queued.job.inputSnapshot.prompt, STYLE_TRANSFER_PROMPT);
    assert.deepEqual(queued.job.inputSnapshot.refImages, ["https://blob.example/frame.png"]);
    const seedream = findCanvasModel("openrouter:bytedance-seed/seedream-5-0-pro")!;
    assert.equal(queued.job.chargedUsd, estimateCanvasModelCostUsd(seedream, { referenceImages: 1 }));

    const settled = await dispatchQueuedCanvasJobById(queued.job._id, harness.deps);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.model, "bytedance-seed/seedream-5-0-pro");
    assert.equal(calls[0]?.prompt, STYLE_TRANSFER_PROMPT);
    assert.deepEqual(calls[0]?.referenceImageUrls, ["https://blob.example/frame.png"]);
    assert.equal(settled?.status, "completed");
    assert.equal(harness.project.nodes.find((item) => item.id === "style")?.data.modelId, "scro:style-transfer");
    assert.match(
      harness.project.nodes.find((item) => item.id === "style")?.data.outputUrl ?? "",
      /^https:\/\/blob\.vercel-storage\.com\/canvas\/user_1\//,
    );
  });

  it("times out stuck async jobs past their provider window and ignores completed ones", () => {
    const start = new Date("2026-11-26T00:00:00.000Z");
    assert.equal(
      isCanvasJobTimedOut(
        { status: "running", outputKind: "image", provider: "openrouter", createdAt: start },
        start.getTime() + CANVAS_IMAGE_JOB_TIMEOUT_MS - 1,
      ),
      false,
    );
    assert.equal(
      isCanvasJobTimedOut(
        { status: "running", outputKind: "image", provider: "openrouter", createdAt: start },
        start.getTime() + CANVAS_IMAGE_JOB_TIMEOUT_MS,
      ),
      true,
    );
    assert.equal(
      isCanvasJobTimedOut(
        { status: "running", outputKind: "video", provider: "openrouter", createdAt: start },
        start.getTime() + CANVAS_ASYNC_JOB_TIMEOUT_MS - 1,
      ),
      false,
    );
    assert.equal(
      isCanvasJobTimedOut(
        { status: "running", outputKind: "video", provider: "openrouter", createdAt: start },
        start.getTime() + CANVAS_ASYNC_JOB_TIMEOUT_MS,
      ),
      true,
    );
    assert.equal(
      isCanvasJobTimedOut(
        { status: "completed", outputKind: "video", provider: "openrouter", createdAt: start },
        start.getTime() + CANVAS_ASYNC_JOB_TIMEOUT_MS * 2,
      ),
      false,
    );
  });
});
