import assert from "node:assert/strict";
import test from "node:test";
import {
  isWorkerRequestAuthorized,
  parseWorkerClaimInput,
  parseWorkerCompleteInput,
  parseWorkerProgressInput,
} from "@/service/worker/worker-auth";

test("isWorkerRequestAuthorized validates Bearer token against WORKER_API_KEY or COMFY_API_KEY", () => {
  const env = { WORKER_API_KEY: "secret-worker-token", COMFY_API_KEY: "comfy-fallback" };
  const okReq = new Request("https://example.com/api/worker/tasks/claim", {
    headers: { Authorization: "Bearer secret-worker-token" },
  });
  assert.equal(isWorkerRequestAuthorized(okReq, env), true);

  const fallbackReq = new Request("https://example.com/api/worker/tasks/claim", {
    headers: { Authorization: "Bearer comfy-fallback" },
  });
  assert.equal(isWorkerRequestAuthorized(fallbackReq, env), true);

  const badReq = new Request("https://example.com/api/worker/tasks/claim", {
    headers: { Authorization: "Bearer wrong-token" },
  });
  assert.equal(isWorkerRequestAuthorized(badReq, env), false);
});

test("parseWorkerClaimInput, parseWorkerProgressInput, and parseWorkerCompleteInput validate payloads", () => {
  const claim = parseWorkerClaimInput({ lane: "gpu", workerId: "vast-59041320" });
  assert.equal(claim.lane, "gpu");
  assert.equal(claim.workerId, "vast-59041320");

  const prog = parseWorkerProgressInput({
    workerId: "vast-59041320",
    progress: 45,
    stage: "rendering",
  });
  assert.equal(prog.progress, 45);
  assert.equal(prog.stage, "rendering");

  const comp = parseWorkerCompleteInput({
    workerId: "vast-59041320",
    outcome: "completed",
    outputUrl: "https://blob.vercel-storage.com/out.mp4",
  });
  assert.equal(comp.outcome, "completed");
  assert.equal(comp.outputUrl, "https://blob.vercel-storage.com/out.mp4");
});
