import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame } from "@/types/project";
import {
  assertClipKeyframes,
  clipKeyframeUrls,
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
