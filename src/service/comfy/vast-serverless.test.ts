import assert from "node:assert/strict";
import test from "node:test";
import { routeVastServerless, videoUrlFromServerlessBody } from "@/service/comfy/vast-serverless";

test("videoUrlFromServerlessBody reads a completed file URL", () => {
  const parsed = videoUrlFromServerlessBody({
    id: "job-1",
    status: "completed",
    output: [{ url: "https://cdn.example/out.mp4", filename: "out.mp4" }],
  });
  assert.equal(parsed.status, "completed");
  assert.equal(parsed.url, "https://cdn.example/out.mp4");
  assert.equal(parsed.id, "job-1");
});

test("routeVastServerless reports an empty workergroup instead of calling the GPU machine", async () => {
  const prev = process.env.VAST_API_KEY;
  process.env.VAST_API_KEY = "vast-test";
  process.env.COMFY_SERVERLESS_ENDPOINT = "scro-h3-comfy-serverless";
  try {
    await assert.rejects(
      () =>
        routeVastServerless(async () =>
          Response.json({
            endpoint: "scro-h3-comfy-serverless",
            status: "total workers: 0 loading workers: 0 standby workers: 0 error workers: 0",
          }),
        ),
      /沒有可用的 H3 worker/,
    );
  } finally {
    if (prev === undefined) delete process.env.VAST_API_KEY;
    else process.env.VAST_API_KEY = prev;
    delete process.env.COMFY_SERVERLESS_ENDPOINT;
  }
});
