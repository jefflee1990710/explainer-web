import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame } from "@/model/project";
import {
  MINIMAX_H3_VIDEO_MODEL,
  assertClipKeyframes,
  clipFrameAnchor,
  clipKeyframeUrls,
  h3ClipVideoInput,
  planFrameSubmissions,
} from "@/service/higgsfield/clip-keyframes";

function frame(
  position: ClipFrame["position"],
  extra: Partial<ClipFrame> = {},
): ClipFrame {
  return {
    clipNumber: 1,
    position,
    prompt: "p",
    status: "completed",
    ...extra,
  };
}

test("clipKeyframeUrls prefers blob over provider URL and ignores empty completed rows", () => {
  assert.deepEqual(
    clipKeyframeUrls(
      [
        frame("start", { blobUrl: "blob-start", outputUrl: "cdn-start" }),
        frame("end", { status: "completed" }),
      ],
      1,
    ),
    { start: "blob-start", end: undefined },
  );
});

test("assertClipKeyframes refuses a missing end file", () => {
  assert.throws(
    () =>
      assertClipKeyframes(
        [frame("start", { blobUrl: "s" }), frame("end", { status: "completed" })],
        1,
      ),
    /起點或終點/,
  );
});

test("clipFrameAnchor: end locks to this clip's completed start", () => {
  const frames = [
    frame("start", { blobUrl: "start-blob" }),
    frame("end", { status: "queued" }),
  ];
  assert.deepEqual(clipFrameAnchor(frames, 1, "end"), {
    url: "start-blob",
    kind: "clip-start",
  });
});

test("clipFrameAnchor: start inherits the previous clip's completed end", () => {
  const frames = [
    frame("end", { clipNumber: 1, blobUrl: "prev-end" }),
    frame("start", { clipNumber: 2, status: "queued" }),
  ];
  assert.deepEqual(clipFrameAnchor(frames, 2, "start"), {
    url: "prev-end",
    kind: "prev-end",
  });
});

test("clipFrameAnchor: start redo falls back to this clip's completed end", () => {
  const frames = [
    frame("start", { status: "queued" }),
    frame("end", { blobUrl: "end-blob" }),
  ];
  assert.deepEqual(clipFrameAnchor(frames, 1, "start"), {
    url: "end-blob",
    kind: "clip-end",
  });
});

test("planFrameSubmissions defers end until this clip's start file exists", () => {
  const frames = [
    frame("start", { status: "queued" }),
    frame("end", { status: "queued" }),
  ];
  const plan = planFrameSubmissions(
    [
      { clipNumber: 1, position: "start" },
      { clipNumber: 1, position: "end" },
    ],
    frames,
  );
  assert.deepEqual(
    plan.ready.map((target) => target.position),
    ["start"],
  );
  assert.deepEqual(
    plan.deferred.map((target) => target.position),
    ["end"],
  );
});

test("planFrameSubmissions sends end immediately when start file is already there", () => {
  const frames = [
    frame("start", { blobUrl: "start-blob" }),
    frame("end", { status: "queued" }),
  ];
  const plan = planFrameSubmissions([{ clipNumber: 1, position: "end" }], frames);
  assert.deepEqual(
    plan.ready.map((target) => target.position),
    ["end"],
  );
  assert.deepEqual(plan.deferred, []);
});

test("h3ClipVideoInput matches Mentalok harness: MiniMax H3 first + last frames", () => {
  assert.equal(MINIMAX_H3_VIDEO_MODEL, "minimax/h3/image-to-video");
  assert.deepEqual(
    h3ClipVideoInput({
      prompt: "walk to the box",
      aspectRatio: "9:16",
      durationSeconds: 5,
      startImageUrl: "https://blob/start.png",
      endImageUrl: "https://blob/end.png",
    }),
    {
      prompt: "walk to the box",
      aspect_ratio: "9:16",
      duration: 5,
      resolution: "2K",
      image_url: "https://blob/start.png",
      end_image_url: "https://blob/end.png",
      aigc_watermark: false,
    },
  );
});

test("h3ClipVideoInput clamps duration to MiniMax H3 5–15s", () => {
  assert.equal(
    h3ClipVideoInput({
      prompt: "p",
      aspectRatio: "16:9",
      durationSeconds: 3,
      startImageUrl: "https://blob/start.png",
      endImageUrl: "https://blob/end.png",
    }).duration,
    5,
  );
  assert.equal(
    h3ClipVideoInput({
      prompt: "p",
      aspectRatio: "16:9",
      durationSeconds: 20,
      startImageUrl: "https://blob/start.png",
      endImageUrl: "https://blob/end.png",
    }).duration,
    15,
  );
});
