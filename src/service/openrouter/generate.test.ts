import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchOpenRouterStatus,
  isOpenRouterStatusUrl,
  openRouterClipVideoBody,
  openRouterImageAspectRatio,
  openRouterImageBody,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";

test("isOpenRouterStatusUrl detects OpenRouter video polling and content URLs", () => {
  assert.equal(
    isOpenRouterStatusUrl("https://openrouter.ai/api/v1/videos/job-123"),
    true,
  );
  assert.equal(
    isOpenRouterStatusUrl("https://openrouter.ai/api/v1/videos/job-123/content?index=0"),
    true,
  );
  assert.equal(
    isOpenRouterStatusUrl("https://platform.higgsfield.ai/requests/abc"),
    false,
  );
  assert.equal(
    isOpenRouterStatusUrl("https://dashscope.aliyuncs.com/api/v1/tasks/abc"),
    false,
  );
});

test("openRouterImageAspectRatio maps GPT-5 Image to supported 1:1 / 3:2 / 2:3", () => {
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "16:9"), "3:2");
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "9:16"), "2:3");
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "2:3"), "2:3");
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "1:1"), "1:1");
});

test("openRouterImageBody formats /api/v1/images payload with input_references", () => {
  assert.deepEqual(
    openRouterImageBody({
      model: "openai/gpt-5-image",
      prompt: "draw a scene",
      aspectRatio: "16:9",
      quality: "high",
      referenceImageUrls: ["https://blob/ref1.png", undefined, "https://blob/ref2.png"],
    }),
    {
      model: "openai/gpt-5-image",
      prompt: "draw a scene",
      aspect_ratio: "3:2",
      quality: "high",
      background: "opaque",
      input_references: [
        { type: "image_url", image_url: { url: "https://blob/ref1.png" } },
        { type: "image_url", image_url: { url: "https://blob/ref2.png" } },
      ],
    },
  );
});

test("openRouterClipVideoBody formats /api/v1/videos payload for bytedance/seedance-2.0-fast", () => {
  assert.deepEqual(
    openRouterClipVideoBody({
      model: "bytedance/seedance-2.0-fast",
      prompt: "camera pans right",
      aspectRatio: "9:16",
      durationSeconds: 3,
      startImageUrl: "https://blob/start.png",
      endImageUrl: "https://blob/end.png",
    }),
    {
      model: "bytedance/seedance-2.0-fast",
      prompt: "camera pans right",
      aspect_ratio: "9:16",
      duration: 5,
      resolution: "720p",
      generate_audio: true,
      frame_images: [
        {
          type: "image_url",
          image_url: { url: "https://blob/start.png" },
          frame_type: "first_frame",
        },
        {
          type: "image_url",
          image_url: { url: "https://blob/end.png" },
          frame_type: "last_frame",
        },
      ],
    },
  );

  const startOnly = openRouterClipVideoBody({
    model: "bytedance/seedance-2.0-fast",
    prompt: "camera pans right",
    aspectRatio: "16:9",
    durationSeconds: 6,
    startImageUrl: "https://blob/start.png",
  });
  assert.equal(startOnly.frame_images.length, 1);
  assert.equal(startOnly.frame_images[0]?.frame_type, "first_frame");
});

test("submitOpenRouterImage posts to /api/v1/images and returns completed data URL", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    calledUrl = String(input);
    calledInit = init;
    return new Response(
      JSON.stringify({
        created: 1748372400,
        data: [{ b64_json: "aGVsbG8=", media_type: "image/png" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const result = await submitOpenRouterImage(
      {
        model: "openai/gpt-5-image",
        prompt: "draw cat",
        aspectRatio: "1:1",
        quality: "medium",
      },
      { fetch: fakeFetch },
    );
    assert.equal(calledUrl, "https://openrouter.ai/api/v1/images");
    assert.equal(calledInit?.method, "POST");
    assert.equal(result.status, "completed");
    assert.deepEqual(result.images, [{ url: "data:image/png;base64,aGVsbG8=" }]);
    assert.ok(result.request_id);
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("submitOpenRouterClipVideo and fetchOpenRouterStatus handle async video lifecycle", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";

  const fakeSubmitFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        id: "vid-job-1",
        polling_url: "/api/v1/videos/vid-job-1",
        status: "pending",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );

  const fakePollFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        id: "vid-job-1",
        polling_url: "https://openrouter.ai/api/v1/videos/vid-job-1",
        status: "completed",
        unsigned_urls: ["https://openrouter.ai/api/v1/videos/vid-job-1/content?index=0"],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const submitted = await submitOpenRouterClipVideo(
      {
        prompt: "walk",
        aspectRatio: "16:9",
        durationSeconds: 5,
        startImageUrl: "https://blob/start.png",
        endImageUrl: "https://blob/end.png",
      },
      { fetch: fakeSubmitFetch },
    );
    assert.equal(submitted.request_id, "vid-job-1");
    assert.equal(submitted.status_url, "https://openrouter.ai/api/v1/videos/vid-job-1");
    assert.equal(submitted.status, "queued");

    const polled = await fetchOpenRouterStatus(submitted.status_url!, {
      fetch: fakePollFetch,
    });
    assert.equal(polled.request_id, "vid-job-1");
    assert.equal(polled.status, "completed");
    assert.deepEqual(polled.video, {
      url: "https://openrouter.ai/api/v1/videos/vid-job-1/content?index=0",
    });
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});
