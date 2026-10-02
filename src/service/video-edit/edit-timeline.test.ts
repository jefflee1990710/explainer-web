import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEditTimeline,
  clipNumberFromTimelineId,
  clipTimelineId,
  clipUrlsForExport,
  defaultTimelineId,
  nextPlayableTimelineId,
  timelineClips,
} from "@/service/video-edit/edit-timeline";

test("timeline is Intro, each clip, then Outro — never Main", () => {
  const items = buildEditTimeline({
    intro: { kind: "image", assetUrl: "https://cdn/intro.png", durationSec: 2 },
    outro: { kind: "video", assetUrl: "https://cdn/outro.mp4", durationSec: 3 },
    clips: [
      { clipNumber: 2, blobUrl: "https://blob/2.mp4" },
      { clipNumber: 1, outputUrl: "https://cdn/1.mp4" },
    ],
    posters: [{ clipNumber: 1, src: "https://cdn/start-1.png" }],
  });

  assert.deepEqual(
    items.map((item) => item.id),
    ["intro", "clip-1", "clip-2", "outro"],
  );
  assert.equal(items.some((item) => item.id === "main"), false);
  assert.equal(items[0].mediaKind, "image");
  assert.equal(items[1].src, "https://cdn/1.mp4");
  assert.equal(items[1].poster, "https://cdn/start-1.png");
  assert.equal(items[2].src, "https://blob/2.mp4");
  assert.equal(items[3].mediaKind, "video");
});

test("empty intro/outro stay on the timeline as unset slots", () => {
  const items = buildEditTimeline({
    clips: [{ clipNumber: 1 }],
  });
  assert.equal(items[0].mediaKind, "empty");
  assert.equal(items[1].id, "clip-1");
  assert.equal(items[1].mediaKind, "empty");
  assert.equal(items[2].mediaKind, "empty");
});

test("playing a clip advances through later clips then outro", () => {
  const items = buildEditTimeline({
    outro: { kind: "image", assetUrl: "https://cdn/outro.png", durationSec: 2 },
    clips: [
      { clipNumber: 1, blobUrl: "https://blob/1.mp4" },
      { clipNumber: 2, blobUrl: "https://blob/2.mp4" },
      { clipNumber: 3 },
    ],
  });
  assert.equal(nextPlayableTimelineId(items, "clip-1"), "clip-2");
  assert.equal(nextPlayableTimelineId(items, "clip-2"), "outro");
  assert.equal(nextPlayableTimelineId(items, "outro"), undefined);
});

test("default preview is the first ready clip", () => {
  const items = buildEditTimeline({
    intro: { kind: "video", assetUrl: "https://cdn/intro.mp4", durationSec: 2 },
    clips: [{ clipNumber: 1, blobUrl: "https://blob/1.mp4" }],
  });
  assert.equal(defaultTimelineId(items), "clip-1");
  assert.equal(clipTimelineId(4), "clip-4");
  assert.equal(clipNumberFromTimelineId("clip-4"), 4);
});

test("export uses storyboard order and skips clips without a file", () => {
  assert.deepEqual(
    clipUrlsForExport([
      { clipNumber: 2, blobUrl: "https://blob/2.mp4" },
      { clipNumber: 1, outputUrl: "https://cdn/1.mp4" },
      { clipNumber: 3 },
    ]),
    ["https://cdn/1.mp4", "https://blob/2.mp4"],
  );
});

test("timeline clips include every storyboard number even before video lands", () => {
  assert.deepEqual(
    timelineClips({
      phaseA: { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] },
      clips: [{ clipNumber: 1, blobUrl: "https://blob/1.mp4" }],
    }),
    [
      { clipNumber: 1, blobUrl: "https://blob/1.mp4", outputUrl: undefined },
      { clipNumber: 2, blobUrl: undefined, outputUrl: undefined },
    ],
  );
});
