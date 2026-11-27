import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob } from "@/model/canvas";
import { applyArgolinkCanvasWebhook } from "@/service/argolink/canvas-webhook";
import type { CanvasExecutorDeps } from "@/service/canvas/execution/jobs/deps";

function runningJob(): CanvasJob {
  return {
    _id: new ObjectId(),
    clerkUserId: "user_1",
    canvasId: new ObjectId(),
    nodeId: "magi",
    provider: "argolink",
    modelId: "argolink:magi-2",
    providerModelId: "magi-2",
    status: "running",
    inputSnapshot: {},
    chargedUsd: 0.51,
    outputKind: "video",
    externalJobId: "req-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("a finished webhook copies the video and a repeat does not settle again", async () => {
  const job = runningJob();
  const persisted: string[] = [];
  const deps = {
    persistMedia: async (url: string) => {
      persisted.push(url);
      return "https://blob.example/canvas/user_1/job.mp4";
    },
    updateCanvasJob: async () => {},
    updateCanvasNodeState: async () => {},
    now: () => new Date("2026-11-27T02:00:00.000Z"),
  } as unknown as Partial<CanvasExecutorDeps>;

  const first = await applyArgolinkCanvasWebhook(
    { request_id: "req-1", status: "done", video: { url: "https://argolink.io/file.mp4" } },
    { findJob: async () => job, deps },
  );
  assert.equal(first.status, 200);
  assert.deepEqual(persisted, ["https://argolink.io/file.mp4"]);

  const again = await applyArgolinkCanvasWebhook(
    { request_id: "req-1", status: "done", video: { url: "https://argolink.io/file.mp4" } },
    { findJob: async () => ({ ...job, status: "completed" }), deps },
  );
  assert.equal(again.status, 200);
  assert.deepEqual(persisted, ["https://argolink.io/file.mp4"]);
});

test("a missing job or a done status without a file asks ArgoLink to retry", async () => {
  const missing = await applyArgolinkCanvasWebhook(
    { request_id: "req-9", status: "done", video: { url: "https://argolink.io/file.mp4" } },
    { findJob: async () => null },
  );
  assert.equal(missing.status, 503);

  const noFile = await applyArgolinkCanvasWebhook(
    { request_id: "req-1", status: "done" },
    { findJob: async () => runningJob() },
  );
  assert.equal(noFile.status, 503);
});

test("a failed webhook refunds the running job once", async () => {
  const job = runningJob();
  let refunds = 0;
  const deps = {
    claimCanvasJobRefund: async () => job,
    refundCreditUsd: async () => {
      refunds += 1;
    },
    updateCanvasJob: async () => {},
    updateCanvasNodeState: async () => {},
    now: () => new Date("2026-11-27T02:00:00.000Z"),
  } as unknown as Partial<CanvasExecutorDeps>;
  const result = await applyArgolinkCanvasWebhook(
    { request_id: "req-1", status: "failed", error: { message: "provider down" } },
    { findJob: async () => job, deps },
  );
  assert.equal(result.status, 200);
  assert.equal(refunds, 1);
});
