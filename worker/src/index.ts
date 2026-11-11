import os from "node:os";
import { loadEnvConfig } from "@next/env";
import { probeNvencSupport } from "@/service/ffmpeg/video-encoder";
import { ensureWorkerTaskIndexes } from "@/service/worker/task-queue";
import { WorkerApiClient } from "./api-client";
import { checkLocalComfyUi } from "./comfy-local";
import { runTwoLaneWorkerLoop } from "./runner";

async function main() {
  loadEnvConfig(process.cwd());

  const workerId =
    process.env.WORKER_ID?.trim() ||
    `vast-${process.env.VAST_CONTAINERLABEL || os.hostname()}-${process.pid}`;
  const gpuConcurrency = Math.max(
    1,
    Number(process.env.WORKER_GPU_CONCURRENCY || 1),
  );
  const cpuConcurrency = Math.max(
    1,
    Number(process.env.WORKER_CPU_CONCURRENCY || 6),
  );

  // GPU-machine workflows (Swap, Teleport, Extend, on-screen text) use local ComfyUI.
  // Storyboard H3 ref2va does not: it calls Vast serverless from VAST_API_KEY.
  const explicitLocalComfyUrl = process.env.COMFY_LOCAL_URL?.trim();
  const localComfyUrl = explicitLocalComfyUrl || "http://127.0.0.1:8188";
  let comfyCheck = await checkLocalComfyUi(localComfyUrl);
  for (let i = 0; i < 6 && !comfyCheck.ok && explicitLocalComfyUrl; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    comfyCheck = await checkLocalComfyUi(localComfyUrl);
  }
  if (comfyCheck.ok || explicitLocalComfyUrl) {
    process.env.COMFY_BASE_URL = localComfyUrl;
    process.env.COMFY_CLIP_VIDEO_ENABLED =
      process.env.COMFY_CLIP_VIDEO_ENABLED || "true";
    console.log(
      `[worker:${workerId}] Local ComfyUI ${comfyCheck.ok ? "online" : "configured"} at ${localComfyUrl} (${comfyCheck.deviceName ?? "GPU"})`,
    );
  } else {
    console.log(
      `[worker:${workerId}] Local ComfyUI not detected at ${localComfyUrl} (${comfyCheck.error}); using configured COMFY_BASE_URL=${process.env.COMFY_BASE_URL ?? "none"}`,
    );
  }

  const encoderMode = await probeNvencSupport();
  console.log(
    `[worker:${workerId}] FFmpeg video encoder mode: ${encoderMode.toUpperCase()}`,
  );

  await ensureWorkerTaskIndexes();

  const webApiBaseUrl = process.env.WORKER_WEB_API_URL?.trim();
  const workerApiKey =
    process.env.WORKER_API_KEY?.trim() || process.env.COMFY_API_KEY?.trim();
  const apiClient =
    webApiBaseUrl && workerApiKey
      ? new WorkerApiClient({
          baseUrl: webApiBaseUrl,
          apiKey: workerApiKey,
          workerId,
        })
      : undefined;

  const controller = new AbortController();
  const shutdown = (sig: string) => {
    console.log(`[worker:${workerId}] Received ${sig}, shutting down...`);
    controller.abort();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log(
    `[worker:${workerId}] Started (GPU lanes: ${gpuConcurrency}, CPU/API lanes: ${cpuConcurrency}, API broker: ${webApiBaseUrl || "direct-mongodb"})`,
  );

  await runTwoLaneWorkerLoop({
    workerId,
    gpuConcurrency,
    cpuConcurrency,
    signal: controller.signal,
    apiClient,
  });
}

main().catch((error) => {
  console.error("[worker] Fatal startup error:", error);
  process.exit(1);
});
