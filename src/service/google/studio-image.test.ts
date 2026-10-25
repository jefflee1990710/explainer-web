import assert from "node:assert/strict";
import test from "node:test";
import {
  GOOGLE_STUDIO_IMAGE_URL,
  googleStudioImageBody,
  googleStudioImageSize,
  googleStudioImageUrl,
  submitGoogleStudioImage,
} from "@/service/google/studio-image";

test("google studio image body asks gemini-3-pro-image for a 2K 16:9 still", () => {
  assert.equal(googleStudioImageSize("2k"), "2K");
  assert.equal(googleStudioImageSize("1k"), "1K");
  assert.deepEqual(
    googleStudioImageBody({
      prompt: "portrait",
      aspectRatio: "16:9",
      resolution: "2k",
      inlineImages: [{ inline_data: { mime_type: "image/jpeg", data: "abc" } }],
    }),
    {
      contents: [
        {
          parts: [
            { text: "portrait" },
            { inline_data: { mime_type: "image/jpeg", data: "abc" } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
      },
    },
  );
});

test("google studio image url keeps the last image part", () => {
  const url = googleStudioImageUrl({
    candidates: [
      {
        content: {
          parts: [
            { text: "draft" },
            { inlineData: { mimeType: "image/png", data: "draft" } },
            { inline_data: { mime_type: "image/png", data: "final" } },
          ],
        },
      },
    ],
  });
  assert.equal(url, "data:image/png;base64,final");
});

test("submitGoogleStudioImage posts to Google AI Studio with GOOGLE_API_KEY", async () => {
  const previous = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = "studio-test-key";
  let calledUrl = "";
  let header = "";
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://blob/ref.png") {
      return new Response(Uint8Array.from([0xff, 0xd8, 0xff, 1]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }
    calledUrl = url;
    header = new Headers(init?.headers).get("x-goog-api-key") || "";
    const body = JSON.parse(String(init?.body));
    assert.equal(body.generationConfig.imageConfig.aspectRatio, "1:1");
    assert.equal(body.contents[0].parts[1].inline_data.mime_type, "image/jpeg");
    return new Response(
      JSON.stringify({
        candidates: [
          { content: { parts: [{ inline_data: { mime_type: "image/png", data: "aGVsbG8=" } }] } },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  try {
    const result = await submitGoogleStudioImage(
      {
        prompt: "portrait",
        aspectRatio: "1:1",
        resolution: "2k",
        referenceImageUrls: ["https://blob/ref.png"],
      },
      { fetch: fakeFetch },
    );
    assert.equal(calledUrl, GOOGLE_STUDIO_IMAGE_URL);
    assert.equal(header, "studio-test-key");
    assert.equal(result.status, "completed");
    assert.equal(result.images?.[0]?.url, "data:image/png;base64,aGVsbG8=");
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previous;
  }
});

test("submitGoogleStudioImage surfaces a provider Terms of Service rejection", async () => {
  const previous = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = "studio-test-key";
  const fakeFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        error: { message: "The request is prohibited due to a violation of provider Terms Of Service." },
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  try {
    await assert.rejects(
      () =>
        submitGoogleStudioImage(
          { prompt: "portrait", aspectRatio: "1:1" },
          { fetch: fakeFetch },
        ),
      /Terms Of Service/,
    );
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previous;
  }
});
