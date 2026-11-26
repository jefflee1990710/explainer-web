import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob, CanvasNodeData } from "@/model/canvas";
import {
  type CanvasJobLedgerDeps,
  buildNodeStateMongoUpdate,
  markJobCompleted,
  markJobFailed,
  markJobQueued,
  markJobRunning,
  refundCanvasJobOnce,
} from "@/service/canvas/execution/job-ledger";

function makeFakeLedger(initialJobs: CanvasJob[] = [], initialNodeData: Record<string, CanvasNodeData> = {}) {
  const jobs = new Map<string, CanvasJob>(initialJobs.map((j) => [j._id.toHexString(), { ...j }]));
  const nodes = new Map<string, CanvasNodeData>(
    Object.entries(initialNodeData).map(([k, v]) => [k, { ...v }]),
  );
  const thumbnails = new Map<string, string>();
  const refunds: Array<{ clerkUserId: string; costUsd: number; spendEventKey?: string }> = [];
  const fixedNow = new Date("2026-11-26T12:00:00.000Z");

  const deps: CanvasJobLedgerDeps = {
    insertCanvasJob: async (job) => {
      jobs.set(job._id.toHexString(), { ...job });
    },
    updateCanvasJob: async (jobId, clerkUserId, update) => {
      const existing = jobs.get(jobId.toHexString());
      if (!existing || existing.clerkUserId !== clerkUserId) return;
      const next: CanvasJob = { ...existing, ...(update.$set ?? {}) };
      if (update.$unset) {
        for (const key of Object.keys(update.$unset) as Array<keyof CanvasJob>) {
          delete next[key];
        }
      }
      jobs.set(jobId.toHexString(), next);
    },
    updateCanvasNodeState: async ({ canvasId, nodeId, patch, thumbnailUrl }) => {
      const cur: CanvasNodeData = { ...(nodes.get(nodeId) ?? { label: nodeId }) };
      for (const [k, v] of Object.entries(patch) as Array<[keyof CanvasNodeData, unknown]>) {
        if (v === undefined) delete cur[k];
        else (cur as Record<string, unknown>)[k] = v;
      }
      if (patch.status === "completed" && typeof patch.outputUrl === "string" && patch.outputUrl.trim()) {
        delete cur.staleOutputUrl;
      }
      nodes.set(nodeId, cur);
      if (thumbnailUrl) thumbnails.set(canvasId.toHexString(), thumbnailUrl);
    },
    claimCanvasJobRefund: async (jobId, clerkUserId, refundedAt) => {
      const existing = jobs.get(jobId.toHexString());
      if (!existing || existing.clerkUserId !== clerkUserId || existing.refundedAt) {
        return null;
      }
      const claimed: CanvasJob = { ...existing, refundedAt, updatedAt: refundedAt };
      jobs.set(jobId.toHexString(), claimed);
      return { ...claimed };
    },
    refundCreditUsd: async (clerkUserId, costUsd, spendEventKey) => {
      refunds.push({ clerkUserId, costUsd, spendEventKey });
    },
    now: () => fixedNow,
  };

  return { jobs, nodes, thumbnails, refunds, fixedNow, deps };
}

describe("service/canvas/job-ledger", () => {
  it("builds Mongo node update that clears staleOutputUrl and sets thumbnailUrl on completed outputs", () => {
    const updatedAt = new Date("2026-11-26T12:00:00.000Z");
    const doc = buildNodeStateMongoUpdate({
      patch: {
        status: "completed",
        outputUrl: "https://blob.example/out.png",
        outputKind: "image",
        lastError: undefined,
      },
      thumbnailUrl: "https://blob.example/out.png",
      updatedAt,
    });

    assert.deepEqual(doc, {
      $set: {
        updatedAt,
        "nodes.$.data.status": "completed",
        "nodes.$.data.outputUrl": "https://blob.example/out.png",
        "nodes.$.data.outputKind": "image",
        thumbnailUrl: "https://blob.example/out.png",
      },
      $unset: {
        "nodes.$.data.lastError": "",
        "nodes.$.data.staleOutputUrl": "",
      },
    });
  });

  it("transitions job from queued -> running -> completed and updates project thumbnail on image outputs", async () => {
    const canvasId = new ObjectId();
    const jobId = new ObjectId();
    const initialJob: CanvasJob = {
      _id: jobId,
      clerkUserId: "user-1",
      canvasId,
      nodeId: "node-img",
      provider: "openrouter",
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      providerModelId: "bytedance-seed/seedream-5-0-pro",
      status: "queued",
      inputSnapshot: { prompt: "cat" },
      chargedUsd: 0.135,
      spendEventKey: "spend:1",
      outputKind: "image",
      createdAt: new Date("2026-11-26T11:59:00.000Z"),
      updatedAt: new Date("2026-11-26T11:59:00.000Z"),
    };
    const { jobs, nodes, thumbnails, deps } = makeFakeLedger(
      [],
      { "node-img": { label: "Img", staleOutputUrl: "https://blob.example/old.png", lastError: "old err" } },
    );

    await markJobQueued(initialJob, deps);
    assert.equal(jobs.get(jobId.toHexString())?.status, "queued");
    assert.equal(nodes.get("node-img")?.status, "queued");
    assert.equal(nodes.get("node-img")?.lastError, undefined);

    const running = await markJobRunning(
      initialJob,
      { externalJobId: "ext-1", statusUrl: "https://status.example/1" },
      deps,
    );
    assert.equal(running.status, "running");
    assert.equal(running.externalJobId, "ext-1");
    assert.equal(nodes.get("node-img")?.status, "running");

    const completed = await markJobCompleted(
      running,
      {
        outputUrl: "https://blob.example/new.png",
        outputKind: "image",
      },
      deps,
    );
    assert.equal(completed.status, "completed");
    assert.equal(completed.outputUrl, "https://blob.example/new.png");
    assert.equal(nodes.get("node-img")?.status, "completed");
    assert.equal(nodes.get("node-img")?.staleOutputUrl, undefined);
    assert.equal(thumbnails.get(canvasId.toHexString()), "https://blob.example/new.png");
  });

  it("refunds at most once on failure and skips credit refund call when chargedUsd is 0", async () => {
    const canvasId = new ObjectId();
    const paidJobId = new ObjectId();
    const freeJobId = new ObjectId();
    const paidJob: CanvasJob = {
      _id: paidJobId,
      clerkUserId: "user-1",
      canvasId,
      nodeId: "node-vid",
      provider: "minimax",
      modelId: "minimax:MiniMax-H3",
      providerModelId: "MiniMax-H3",
      status: "running",
      inputSnapshot: {},
      chargedUsd: 1.17,
      spendEventKey: "spend:paid",
      outputKind: "video",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const freeJob: CanvasJob = {
      ...paidJob,
      _id: freeJobId,
      nodeId: "node-ff",
      provider: "ffmpeg",
      chargedUsd: 0,
      spendEventKey: undefined,
    };

    const { nodes, refunds, deps } = makeFakeLedger([paidJob, freeJob]);

    const failedPaid = await markJobFailed(paidJob, "Provider timeout", deps);
    assert.equal(failedPaid.status, "failed");
    assert.ok(failedPaid.refundedAt);
    assert.equal(nodes.get("node-vid")?.status, "failed");
    assert.equal(nodes.get("node-vid")?.lastError, "Provider timeout");
    assert.equal(refunds.length, 1);
    assert.deepEqual(refunds[0], {
      clerkUserId: "user-1",
      costUsd: 1.17,
      spendEventKey: "spend:paid",
    });

    // Second refund attempt must be a no-op.
    const secondRefund = await refundCanvasJobOnce(paidJobId, "user-1", deps);
    assert.deepEqual(secondRefund, {
      refunded: false,
      alreadyRefunded: true,
      refundedUsd: 0,
    });
    assert.equal(refunds.length, 1);

    // Free FFmpeg job claims refund slot without calling billing refundCreditUsd.
    const failedFree = await markJobFailed(freeJob, "FFmpeg error", deps, { skipRefund: true });
    assert.equal(failedFree.status, "failed");
    assert.equal(refunds.length, 1);
  });
});
