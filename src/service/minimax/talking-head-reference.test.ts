import assert from "node:assert/strict";
import test from "node:test";
import {
  isMinimaxVideoStatusUrl,
  mapMinimaxVideoStatus,
  talkingHeadReferenceBody,
  talkingHeadReferenceDurationSeconds,
  talkingHeadReferencePrompt,
} from "@/service/minimax/talking-head-reference";

test("talkingHeadReferenceDurationSeconds follows the voice and stays inside 4–15s", () => {
  assert.equal(talkingHeadReferenceDurationSeconds(3.2), 4);
  assert.equal(talkingHeadReferenceDurationSeconds(5.1), 6);
  assert.equal(talkingHeadReferenceDurationSeconds(15.4), 15);
  assert.equal(talkingHeadReferenceDurationSeconds(0), 5);
});

test("talkingHeadReferenceBody sends a closed-mouth still and the voice, without keyframes", () => {
  const body = talkingHeadReferenceBody({
    prompt: "speaks the reference audio",
    imageUrl: "https://cdn.example/start.jpg",
    audioUrl: "https://cdn.example/line.mp3",
    durationSeconds: 5.2,
    aspectRatio: "9:16",
  });
  assert.equal(body.model, "MiniMax-H3");
  assert.equal(body.duration, 6);
  assert.equal(body.ratio, "9:16");
  assert.equal(body.resolution, "2K");
  assert.deepEqual(
    body.content.map((item) => ("role" in item ? item.role : item.type)),
    ["text", "reference_image", "reference_audio"],
  );
  const encoded = JSON.stringify(body.content);
  assert.equal(encoded.includes("first_frame"), false);
  assert.equal(encoded.includes("last_frame"), false);
});

test("talkingHeadReferencePrompt asks the mouth to follow the audio and then close", () => {
  const prompt = talkingHeadReferencePrompt("有無諗過你個Instagram都可以變成你嘅生財工具？");
  assert.match(prompt, /reference audio/);
  assert.match(prompt, /有無諗過你個Instagram/);
  assert.match(prompt, /settles closed/);
  assert.doesNotMatch(prompt, /\bstill\b|\bstatic\b/i);
});

test("mapMinimaxVideoStatus maps the official task states", () => {
  assert.equal(mapMinimaxVideoStatus("succeeded"), "completed");
  assert.equal(mapMinimaxVideoStatus("running"), "in_progress");
  assert.equal(mapMinimaxVideoStatus("queued"), "queued");
  assert.equal(mapMinimaxVideoStatus("failed"), "failed");
  assert.equal(isMinimaxVideoStatusUrl("https://api.minimax.io/v2/query/video_generation/abc"), true);
  assert.equal(isMinimaxVideoStatusUrl("https://openrouter.ai/api/v1/videos/abc"), false);
});
