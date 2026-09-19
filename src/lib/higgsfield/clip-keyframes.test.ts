import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame } from "@/types/project";
import {
  assertClipKeyframes,
  clipFrameAnchor,
  clipKeyframeUrls,
  planFrameSubmissions,
  wanClipVideoInput,
} from "./clip-keyframes";

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

test("wanClipVideoInput always sends first + last frame fields", () => {
  assert.deepEqual(
    wanClipVideoInput({
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
      resolution: "720p",
      image_url: "https://blob/start.png",
      end_image_url: "https://blob/end.png",
      generate_audio: true,
    },
  );
});
