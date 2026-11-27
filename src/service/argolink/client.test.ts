import assert from "node:assert/strict";
import test from "node:test";
import {
  argolinkCallbackUrl,
  argolinkCanvasVideoBody,
  fetchArgolinkCanvasVideo,
  parseArgolinkVideoStatus,
  submitArgolinkCanvasVideo,
} from "@/service/argolink/client";

test("MAGI-2 request uses duration, 1080p, ratio, and reference stills instead of frames", () => {
  const body = argolinkCanvasVideoBody({
    model: "magi-2",
    prompt: "  walk into the rain  ",
    aspectRatio: "9:16",
    durationSeconds: 3,
    referenceImageUrls: ["https://cdn.example/a.png", " https://cdn.example/a.png ", "https://cdn.example/b.png"],
    videoUrl: "https://cdn.example/move.mp4",
    audioUrl: "https://cdn.example/beat.mp3",
    callbackUrl: "https://www.scro.io/api/webhooks/argolink",
  });
  assert.equal(body.model, "magi-2");
  assert.equal(body.prompt, "walk into the rain");
  assert.equal(body.duration, 4);
  assert.equal(body.resolution, "1080p");
  assert.equal(body.aspect_ratio, "9:16");
  assert.equal(body.callback_url, "https://www.scro.io/api/webhooks/argolink");
  assert.deepEqual(body.reference_images, [
    { url: "https://cdn.example/a.png" },
    { url: "https://cdn.example/b.png" },
  ]);
  assert.deepEqual(body.reference_videos, [{ url: "https://cdn.example/move.mp4" }]);
  assert.deepEqual(body.reference_audios, [{ url: "https://cdn.example/beat.mp3" }]);
  assert.equal("start_image" in body, false);
  assert.equal("end_image" in body, false);
});

test("MAGI-2 clamps a long clip to 30 seconds and falls back to 16:9", () => {
  const body = argolinkCanvasVideoBody({
    model: "magi-2",
    prompt: "aerial",
    aspectRatio: "21:9",
    durationSeconds: 90,
  });
  assert.equal(body.duration, 30);
  assert.equal(body.aspect_ratio, "16:9");
});

test("callback URL is only sent for a public https app that has a webhook secret", () => {
  assert.equal(argolinkCallbackUrl("http://localhost:3000", "whsec_abc"), undefined);
  assert.equal(argolinkCallbackUrl("https://www.scro.io", ""), undefined);
  assert.equal(
    argolinkCallbackUrl("https://www.scro.io/", "whsec_abc"),
    "https://www.scro.io/api/webhooks/argolink",
  );
});

test("submit returns the request id and retries once without callback_url on 503", async () => {
  const bodies: unknown[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    if (bodies.length === 1) {
      return new Response(JSON.stringify({ error: { message: "callback busy" } }), { status: 503 });
    }
    return new Response(JSON.stringify({ request_id: "req-1" }), { status: 200 });
  };
  const result = await submitArgolinkCanvasVideo(
    {
      model: "magi-2",
      prompt: "foggy pines",
      callbackUrl: "https://www.scro.io/api/webhooks/argolink",
    },
    { fetch: fetchImpl, apiKey: "test-key" },
  );
  assert.equal(result.status, "queued");
  assert.equal(result.request_id, "req-1");
  assert.equal(result.status_url, "https://argolink.io/v1/videos/req-1");
  assert.equal((bodies[0] as { callback_url?: string }).callback_url, "https://www.scro.io/api/webhooks/argolink");
  assert.equal("callback_url" in (bodies[1] as object), false);
});

test("status documents map done, expired, and a moderation failure", () => {
  const done = parseArgolinkVideoStatus({
    request_id: "req-1",
    status: "done",
    video: { url: "https://argolink.io/v1/videos/req-1/file" },
  });
  assert.equal(done.status, "completed");
  assert.equal(done.video?.url, "https://argolink.io/v1/videos/req-1/file");

  const expired = parseArgolinkVideoStatus({ request_id: "req-2", status: "expired" });
  assert.equal(expired.status, "failed");
  assert.match(expired.error || "", /過期/);

  const blocked = parseArgolinkVideoStatus({
    request_id: "req-3",
    status: "failed",
    error: { message: "content policy" },
  });
  assert.equal(blocked.status, "nsfw");
});

test("a failed submit is returned instead of thrown", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: "invalid_input" } }), { status: 400 });
  const result = await submitArgolinkCanvasVideo(
    { model: "magi-2", prompt: "x" },
    { fetch: fetchImpl, apiKey: "test-key" },
  );
  assert.equal(result.status, "failed");
  assert.equal(result.error, "invalid_input");
});

test("status polling throws on a non-2xx response so the job stays running", async () => {
  const fetchImpl: typeof fetch = async () => new Response("nope", { status: 500 });
  await assert.rejects(
    () => fetchArgolinkCanvasVideo("https://argolink.io/v1/videos/req-1", { fetch: fetchImpl, apiKey: "k" }),
    /500/,
  );
});
