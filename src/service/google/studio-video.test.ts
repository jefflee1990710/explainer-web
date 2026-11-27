import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchGoogleStudioVideo,
  googleStudioVideoRequest,
  googleStudioVideoResult,
  submitGoogleStudioVideo,
} from "@/service/google/studio-video";

test("Omni request is a background Interactions call at 720p", () => {
  assert.deepEqual(
    googleStudioVideoRequest({
      model: "google:gemini-omni-1.2-flash",
      prompt: "a paper plane through a library",
      aspectRatio: "9:16",
      durationSeconds: 15,
      startImage: { mimeType: "image/png", data: "start" },
      endImage: { mimeType: "image/jpeg", data: "end" },
      referenceImages: [{ mimeType: "image/png", data: "ref" }],
    }),
    {
      model: "gemini-omni-1.2-flash",
      background: true,
      input: [
        { type: "image", data: "start", mime_type: "image/png" },
        { type: "image", data: "end", mime_type: "image/jpeg" },
        { type: "image", data: "ref", mime_type: "image/png" },
        { type: "text", text: "a paper plane through a library" },
      ],
      response_format: {
        type: "video",
        aspect_ratio: "9:16",
        resolution: "720p",
        duration: "10s",
        delivery: "uri",
      },
    },
  );
});

test("a completed interaction reads the last video step", async () => {
  const result = await googleStudioVideoResult(
    {
      id: "v1_omni",
      status: "completed",
      model: "gemini-omni-1.2-flash",
      steps: [
        { type: "thought", content: [{ type: "text", text: "planning" }] },
        {
          type: "model_output",
          content: [{ type: "video", mime_type: "video/mp4", data: "AAAA" }],
        },
      ],
    },
    fetch,
  );
  assert.equal(result.status, "completed");
  assert.equal(result.video?.url, "data:video/mp4;base64,AAAA");
});

test("a failed interaction keeps failed status and reads the nested provider message", async () => {
  const result = await googleStudioVideoResult(
    {
      id: "v1_failed",
      status: "failed",
      error: {
        message: "Provider returned error",
        details: [{ message: "aspect ratio is not supported" }],
      },
    },
    fetch,
  );
  assert.equal(result.status, "failed");
  assert.equal(result.error, "aspect ratio is not supported");
});

test("submitGoogleStudioVideo posts to the Interactions API and keeps the id for polling", async () => {
  const prev = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "studio-test";
  let posted = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    posted = String(input);
    const header = new Headers(init?.headers);
    assert.equal(header.get("x-goog-api-key"), "studio-test");
    return new Response(JSON.stringify({ id: "v1_job", status: "in_progress", model: "gemini-omni-1.2-flash" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const result = await submitGoogleStudioVideo({
      model: "gemini-omni-1.2-flash",
      prompt: "sunrise",
      durationSeconds: 8,
    });
    assert.equal(posted, "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(result.status, "in_progress");
    assert.equal(result.request_id, "v1_job");
    const polled = await fetchGoogleStudioVideo("v1_job");
    assert.equal(polled.request_id, "v1_job");
  } finally {
    globalThis.fetch = originalFetch;
    if (prev === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    else process.env.GOOGLE_GENERATIVE_AI_API_KEY = prev;
  }
});
