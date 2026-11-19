import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasEdge, CanvasJob, CanvasNode, CanvasNodeData, CanvasProject } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import {
  type CanvasExecutorDeps,
  pollCanvasJobs,
  refundCanvasJobOnce,
  submitCanvasNodeJob,
} from "@/service/canvas/executor";
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
      assert.equal(result.requiredUsd, 0.15);
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
      assert.equal(result.job.chargedUsd, 0.15);
      assert.equal(result.job.outputKind, "image");
      assert.match(result.job.outputUrl || "", /^https:\/\/blob\.vercel-storage\.com\/canvas\/user_1\/.+\.png$/);
      assert.equal(result.creditUsd, 0.85);
    }
    assert.equal(harness.persistedCalls.length, 1);
    assert.equal(harness.persistedCalls[0]?.url, "data:image/png;base64,aGVsbG8=");
    assert.equal(harness.refundCalls.length, 0);

    const updatedNode = harness.project.nodes.find((n) => n.id === "img-node");
    assert.equal(updatedNode?.data.status, "completed");
    assert.equal(updatedNode?.data.outputKind, "image");
    assert.equal(updatedNode?.data.lastCostUsd, 0.15);
    assert.equal(updatedNode?.data.outputUrl, harness.project.thumbnailUrl);
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
    assert.equal(harness.refundCalls[0]?.costUsd, 0.15);
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
});
