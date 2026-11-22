import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL,
  googleStudioImageFromResponse,
  googleStudioImageModel,
  googleStudioImageRequest,
  submitGoogleStudioImage,
} from "@/service/google/studio-image";

test("Nano Banana 2.1 request asks Google AI Studio for the project ratio and size", () => {
  assert.equal(googleStudioImageModel("google/gemini-nano-banana-2.1"), "gemini-nano-banana-2.1");
  assert.equal(googleStudioImageModel("google:gemini-3-pro-image"), "gemini-3-pro-image");
  assert.equal(googleStudioImageModel("gemini-2.5-flash-image"), "gemini-2.5-flash-image");
  assert.equal(googleStudioImageModel("bytedance-seed/seedream-5-0-pro"), undefined);

  assert.deepEqual(
    googleStudioImageRequest({
      prompt: "draw a papercraft frame",
      aspectRatio: "9:16",
      resolution: "1k",
      referenceImages: [{ mimeType: "image/png", data: "abc" }],
    }),
    {
      contents: [
        {
          role: "user",
          parts: [
            { text: "draw a papercraft frame" },
            { inlineData: { mimeType: "image/png", data: "abc" } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "9:16", imageSize: "1K" },
      },
    },
  );

  assert.equal(
    googleStudioImageRequest({
      prompt: "wide",
      aspectRatio: "16:9",
      resolution: "4k",
    }).generationConfig.imageConfig.imageSize,
    "4K",
  );
  assert.equal(
    googleStudioImageRequest({
      model: "gemini-2.5-flash-image",
      prompt: "legacy",
      aspectRatio: "1:1",
      resolution: "4k",
    }).generationConfig.imageConfig.imageSize,
    undefined,
  );
});

test("the delivered still is the last non-thought image", () => {
  const image = googleStudioImageFromResponse({
    candidates: [
      {
        content: {
          parts: [
            { thought: true, inlineData: { mimeType: "image/png", data: "draft" } },
            { text: "done" },
            { inline_data: { mime_type: "image/jpeg", data: "final" } },
          ],
        },
      },
    ],
  });
  assert.deepEqual(image, { mimeType: "image/jpeg", data: "final" });
});

test("submitGoogleStudioImage posts to generateContent and returns a data URL", async () => {
  const prev = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "studio-test";
  let postedUrl = "";
  let postedModelSize = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    postedUrl = String(input);
    const body = JSON.parse(String(init?.body)) as {
      generationConfig: { imageConfig: { imageSize: string } };
    };
    postedModelSize = body.generationConfig.imageConfig.imageSize;
    const header = new Headers(init?.headers);
    assert.equal(header.get("x-goog-api-key"), "studio-test");
    return new Response(
      JSON.stringify({
        responseId: "studio-1",
        candidates: [
          { content: { parts: [{ inlineData: { mimeType: "image/png", data: "aGVsbG8=" } }] } },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const result = await submitGoogleStudioImage({
      model: "google/gemini-nano-banana-2.1",
      prompt: "draw",
      aspectRatio: "9:16",
      resolution: "2k",
      referenceImageUrls: ["data:image/png;base64,abc"],
    });
    assert.equal(
      postedUrl,
      `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL}:generateContent`,
    );
    assert.equal(postedModelSize, "2K");
    assert.equal(result.model, "gemini-nano-banana-2.1");
    assert.equal(result.request_id, "studio-1");
    assert.equal(result.images?.[0]?.url, "data:image/png;base64,aGVsbG8=");
  } finally {
    globalThis.fetch = originalFetch;
    if (prev === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    else process.env.GOOGLE_GENERATIVE_AI_API_KEY = prev;
  }
});
