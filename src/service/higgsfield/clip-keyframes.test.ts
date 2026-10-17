import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame } from "@/model/project";
import {
  MINIMAX_H3_VIDEO_MODEL,
  SEEDANCE_2_FAST_VIDEO_MODEL,
  SEEDANCE_2_VIDEO_MODEL,
  assertClipKeyframes,
  clipFrameAnchor,
  clipKeyframeUrls,
  clipVideoModel,
  videoKeyframeUrls,
  h3ClipVideoInput,
  planFrameSubmissions,
  seedanceClipVideoInput,
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

test("videoKeyframeUrls sends the merged still and never the clean one", () => {
  const frames = [
    frame("start", { blobUrl: "clean-start", mergedUrl: "merged-start" }),
    frame("end", { blobUrl: "clean-end" }),
  ];
  assert.deepEqual(videoKeyframeUrls(frames, 1, { merged: true }), {
    start: "merged-start",
    end: undefined,
  });
  assert.deepEqual(videoKeyframeUrls(frames, 1), {
    start: "clean-start",
    end: "clean-end",
  });
});

test("videoKeyframeUrls lands a talking-head clip on the next clip's start", () => {
  const frames = [
    frame("start", { blobUrl: "clip1-start" }),
    frame("end", { blobUrl: "clip1-old-end" }),
    frame("start", { clipNumber: 2, blobUrl: "clip2-start" }),
  ];
  assert.deepEqual(videoKeyframeUrls(frames, 1, { endFromNextStart: true }), {
    start: "clip1-start",
    end: "clip2-start",
  });
  assert.deepEqual(videoKeyframeUrls(frames, 2, { endFromNextStart: true }), {
    start: "clip2-start",
    end: undefined,
  });
});

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

test("clipFrameAnchor: end locks to this clip's completed start, or Clip 1 when anchorToFirstClip is set", () => {
  const frames = [
    frame("start", { clipNumber: 1, blobUrl: "clip1-start" }),
    frame("end", { clipNumber: 1, blobUrl: "clip1-end" }),
    frame("start", { clipNumber: 4, blobUrl: "clip3-end" }),
    frame("end", { clipNumber: 4, status: "queued" }),
  ];
  assert.deepEqual(clipFrameAnchor(frames, 1, "end"), {
    url: "clip1-start",
    kind: "clip-start",
  });
  assert.deepEqual(clipFrameAnchor(frames, 4, "end"), {
    url: "clip3-end",
    kind: "clip-start",
  });
  assert.deepEqual(clipFrameAnchor(frames, 4, "end", { anchorToFirstClip: true }), {
    url: "clip1-start",
    kind: "clip-start",
  });
});

test("clipFrameAnchor: talking-head later starts lock to Clip 1's start", () => {
  const frames = [
    frame("start", { clipNumber: 1, blobUrl: "clip1-start" }),
    frame("end", { clipNumber: 2, blobUrl: "clip2-end" }),
    frame("start", { clipNumber: 3, status: "queued" }),
  ];
  assert.deepEqual(clipFrameAnchor(frames, 3, "start", { anchorToFirstClip: true }), {
    url: "clip1-start",
    kind: "clip-start",
  });
  assert.equal(
    clipFrameAnchor([frame("start", { clipNumber: 1, status: "queued" })], 3, "start", {
      anchorToFirstClip: true,
    }),
    undefined,
  );
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

test("planFrameSubmissions holds the next start until the previous end is in this batch", () => {
  const frames = [
    frame("start", { clipNumber: 1, status: "queued" }),
    frame("end", { clipNumber: 1, status: "queued" }),
    frame("start", { clipNumber: 2, status: "queued" }),
    frame("end", { clipNumber: 2, status: "queued" }),
  ];
  const plan = planFrameSubmissions(
    [
      { clipNumber: 1, position: "start" },
      { clipNumber: 1, position: "end" },
      { clipNumber: 2, position: "start" },
      { clipNumber: 2, position: "end" },
    ],
    frames,
  );
  assert.deepEqual(
    plan.ready.map((target) => `${target.clipNumber}:${target.position}`),
    ["1:start"],
  );
  assert.deepEqual(
    plan.deferred.map((target) => `${target.clipNumber}:${target.position}`),
    ["1:end", "2:start", "2:end"],
  );
});

test("planFrameSubmissions sends the next start once the previous end file exists", () => {
  const frames = [
    frame("end", { clipNumber: 1, blobUrl: "prev-end" }),
    frame("start", { clipNumber: 2, status: "queued" }),
  ];
  const plan = planFrameSubmissions([{ clipNumber: 2, position: "start" }], frames);
  assert.deepEqual(
    plan.ready.map((target) => target.position),
    ["start"],
  );
  assert.deepEqual(plan.deferred, []);
});

test("planFrameSubmissions holds talking-head later starts until Clip 1's start exists", () => {
  const targets = [
    { clipNumber: 1, position: "start" as const },
    { clipNumber: 2, position: "start" as const },
    { clipNumber: 3, position: "start" as const },
    { clipNumber: 3, position: "end" as const },
  ];
  const plan = planFrameSubmissions(targets, [], { startsFollowFirstClip: true });
  assert.deepEqual(plan.ready, [{ clipNumber: 1, position: "start" }]);
  assert.deepEqual(plan.deferred, [
    { clipNumber: 2, position: "start" },
    { clipNumber: 3, position: "start" },
    { clipNumber: 3, position: "end" },
  ]);
  const later = planFrameSubmissions(
    [{ clipNumber: 2, position: "start" }],
    [frame("start", { clipNumber: 1, blobUrl: "clip1-start" })],
    { startsFollowFirstClip: true },
  );
  assert.deepEqual(later.ready, [{ clipNumber: 2, position: "start" }]);
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

test("clipVideoModel uses Seedance 2.0 for realistic and Seedance 2.0 Fast for non-realistic styles", () => {
  assert.equal(SEEDANCE_2_VIDEO_MODEL, "bytedance/seedance-2.0");
  assert.equal(SEEDANCE_2_FAST_VIDEO_MODEL, "bytedance/seedance-2.0-fast");
  assert.equal(clipVideoModel("realistic"), SEEDANCE_2_VIDEO_MODEL);
  assert.equal(clipVideoModel({ id: "user-style", baseStyleId: "realistic" }), SEEDANCE_2_VIDEO_MODEL);
  assert.equal(clipVideoModel("doodle"), SEEDANCE_2_FAST_VIDEO_MODEL);
  assert.equal(clipVideoModel({ id: "user-style", baseStyleId: "doodle" }), SEEDANCE_2_FAST_VIDEO_MODEL);
  assert.deepEqual(
    seedanceClipVideoInput({
      prompt: "walk to the box",
      durationSeconds: 5,
      startImageUrl: "https://blob/start.png",
      endImageUrl: "https://blob/end.png",
    }),
    {
      prompt: "walk to the box",
      duration: 5,
      resolution: "1080p",
      image_url: "https://blob/start.png",
      end_image_url: "https://blob/end.png",
      generate_audio: true,
    },
  );
});

test("Seedance and MiniMax H3 omit the end image when the clip sends the start still only", () => {
  const input = seedanceClipVideoInput({
    prompt: "glide the card over",
    durationSeconds: 5,
    startImageUrl: "https://blob/start.png",
  });
  assert.equal(input.image_url, "https://blob/start.png");
  assert.equal("end_image_url" in input, false);
  const h3 = h3ClipVideoInput({
    prompt: "slide cardboard card in from right",
    aspectRatio: "9:16",
    durationSeconds: 5,
    startImageUrl: "https://blob/start.png",
  });
  assert.equal(h3.image_url, "https://blob/start.png");
  assert.equal("end_image_url" in h3, false);
  assert.doesNotThrow(() =>
    assertClipKeyframes(
      [frame("start", { blobUrl: "https://blob/start.png" })],
      1,
      { startOnly: true },
    ),
  );
});
