import assert from "node:assert/strict";
import test from "node:test";
import { WorkerApiClient } from "./api-client";
import { checkLocalComfyUi } from "./comfy-local";
import { runTwoLaneWorkerLoop } from "./runner";

test("WorkerApiClient sends Authorization Bearer header for claim, progress, and complete", async () => {
  const calls: Array<{ url: string; method: string; auth: string | null; body: unknown }> = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method: init?.method ?? "GET",
      auth: headers.get("authorization"),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        task: null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new WorkerApiClient({
    baseUrl: "https://explainer.example.com/",
    apiKey: "worker-key-123",
    workerId: "vast-59041320",
    fetchFn: fakeFetch,
  });

  const claimed = await client.claimTask("gpu");
  assert.equal(claimed, null);
  await client.reportProgress("task_1", 50, "rendering");
  await client.completeTask("task_1", {
    outcome: "completed",
    outputUrl: "https://blob.vercel-storage.com/video.mp4",
  });

  assert.equal(calls.length, 3);
  assert.equal(calls[0]!.url, "https://explainer.example.com/api/worker/tasks/claim");
  assert.equal(calls[0]!.auth, "Bearer worker-key-123");
  assert.equal(calls[1]!.url, "https://explainer.example.com/api/worker/tasks/task_1/progress");
  assert.equal(calls[2]!.url, "https://explainer.example.com/api/worker/tasks/task_1/complete");
});

test("checkLocalComfyUi probes /system_stats and reports device name", async () => {
  const res = await checkLocalComfyUi("http://127.0.0.1:8188", async () => {
    return new Response(
      JSON.stringify({
        devices: [{ name: "cuda:0 NVIDIA GeForce RTX 4060 Ti", vram_total: 17175674880 }],
      }),
      { status: 200 },
    );
  });
  assert.equal(res.ok, true);
  assert.match(res.deviceName ?? "", /RTX 4060 Ti/);
});

test("runTwoLaneWorkerLoop enforces 1 GPU task at a time while running CPU tasks concurrently", async () => {
  let activeGpu = 0;
  let maxActiveGpu = 0;
  let activeCpu = 0;
  let maxActiveCpu = 0;
  let gpuRemaining = 2;
  let cpuRemaining = 4;

  const controller = new AbortController();

  await runTwoLaneWorkerLoop({
    workerId: "test-worker",
    gpuConcurrency: 1,
    cpuConcurrency: 3,
    idleSleepMs: 5,
    signal: controller.signal,
    claimAndRunOne: async (lane) => {
      if (lane === "gpu") {
        if (gpuRemaining <= 0) return false;
        gpuRemaining -= 1;
        activeGpu += 1;
        maxActiveGpu = Math.max(maxActiveGpu, activeGpu);
        await new Promise((r) => setTimeout(r, 20));
        activeGpu -= 1;
        if (gpuRemaining === 0 && cpuRemaining === 0 && activeCpu === 0) {
          controller.abort();
        }
        return true;
      } else {
        if (cpuRemaining <= 0) return false;
        cpuRemaining -= 1;
        activeCpu += 1;
        maxActiveCpu = Math.max(maxActiveCpu, activeCpu);
        await new Promise((r) => setTimeout(r, 20));
        activeCpu -= 1;
        if (gpuRemaining === 0 && cpuRemaining === 0 && activeGpu === 0 && activeCpu === 0) {
          controller.abort();
        }
        return true;
      }
    },
  });

  assert.equal(maxActiveGpu, 1);
  assert.ok(maxActiveCpu >= 2);
});
