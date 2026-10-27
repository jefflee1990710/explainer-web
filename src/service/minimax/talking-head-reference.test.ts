import assert from "node:assert/strict";
import test from "node:test";
import {
  isMinimaxVideoStatusUrl,
  mapMinimaxVideoStatus,
  talkingHeadBridgeBody,
  talkingHeadBridgePrompt,
  talkingHeadFollowBody,
  talkingHeadFollowPrompt,
  talkingHeadReferenceDurationSeconds,
} from "@/service/minimax/talking-head-reference";

test("talkingHeadReferenceDurationSeconds follows the voice and stays inside 4–15s", () => {
  assert.equal(talkingHeadReferenceDurationSeconds(3.2), 4);
  assert.equal(talkingHeadReferenceDurationSeconds(5.1), 6);
  assert.equal(talkingHeadReferenceDurationSeconds(15.4), 15);
  assert.equal(talkingHeadReferenceDurationSeconds(0), 5);
});

test("talkingHeadBridgeBody sends first and last frames and no audio", () => {
  const body = talkingHeadBridgeBody({
    prompt: "lands on the end image",
    startImageUrl: "https://cdn.example/start.jpg",
    endImageUrl: "https://cdn.example/next-start.jpg",
    durationSeconds: 5.2,
    aspectRatio: "9:16",
  });
  assert.equal(body.model, "MiniMax-H3");
  assert.equal(body.duration, 6);
  assert.equal(body.ratio, "9:16");
  assert.equal(body.resolution, "2K");
  assert.deepEqual(
    body.content.map((item) => ("role" in item ? item.role : item.type)),
    ["text", "first_frame", "last_frame"],
  );
  const encoded = JSON.stringify(body.content);
  assert.equal(encoded.includes("reference_audio"), false);
  assert.equal(encoded.includes("reference_video"), false);
});

test("talkingHeadFollowBody sends the bridge video and the voice, without keyframes", () => {
  const body = talkingHeadFollowBody({
    prompt: "mouth follows audio 1",
    videoUrl: "https://cdn.example/bridge.mp4",
    audioUrl: "https://cdn.example/line.mp3",
    durationSeconds: 6,
    aspectRatio: "9:16",
  });
  assert.deepEqual(
    body.content.map((item) => ("role" in item ? item.role : item.type)),
    ["text", "reference_video", "reference_audio"],
  );
  const encoded = JSON.stringify(body.content);
  assert.equal(encoded.includes("first_frame"), false);
  assert.equal(encoded.includes("last_frame"), false);
});

test("talking head prompts keep the cut on the bridge and the mouth on the follow", () => {
  const line = "有無諗過你個Instagram都可以變成你嘅生財工具？";
  const bridge = talkingHeadBridgePrompt(line);
  const follow = talkingHeadFollowPrompt(line);
  assert.match(bridge, /end image/);
  assert.match(bridge, /有無諗過你個Instagram/);
  assert.match(follow, /Video 1/);
  assert.match(follow, /Audio 1/);
  assert.match(follow, /settles closed/);
  assert.doesNotMatch(bridge, /\bstill\b|\bstatic\b/i);
  assert.doesNotMatch(follow, /\bstill\b|\bstatic\b/i);
});

test("mapMinimaxVideoStatus maps the official task states", () => {
  assert.equal(mapMinimaxVideoStatus("succeeded"), "completed");
  assert.equal(mapMinimaxVideoStatus("running"), "in_progress");
  assert.equal(mapMinimaxVideoStatus("queued"), "queued");
  assert.equal(mapMinimaxVideoStatus("failed"), "failed");
  assert.equal(isMinimaxVideoStatusUrl("https://api.minimax.io/v2/query/video_generation/abc"), true);
  assert.equal(isMinimaxVideoStatusUrl("https://openrouter.ai/api/v1/videos/abc"), false);
});
