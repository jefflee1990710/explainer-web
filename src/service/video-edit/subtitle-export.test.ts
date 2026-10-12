import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clipsWithChangedVo,
  plateLineStale,
  subtitleBurnArgs,
  subtitleExportBlocked,
  subtitleFrameSize,
} from "@/service/video-edit/subtitle-export";

test("export waits until every overlay plate is completed", () => {
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] },
      subtitlePlates: [
        { clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png" },
        { clipNumber: 2, status: "failed" },
      ],
    }),
    true,
  );
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1 }] },
      subtitlePlates: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png" }],
    }),
    false,
  );
  assert.equal(subtitleExportBlocked({ phaseA: { clips: [{ clipNumber: 1 }] } }), false);
});

test("burn args loop the plate and keep the clip audio", () => {
  const args = subtitleBurnArgs({
    clip: "in.mp4",
    plate: "plate.png",
    out: "out.mp4",
    durationSec: 5,
    fps: 24,
    hasAudio: true,
    aspect: "9:16",
    width: 1080,
    height: 1920,
  });
  assert.deepEqual(args.slice(0, 9), ["-i", "in.mp4", "-loop", "1", "-framerate", "24", "-t", "5", "-i"]);
  assert.ok(args.join(" ").includes("[1:v]scale=842:-1"));
  assert.ok(args.join(" ").includes("-map 0:a -c:a copy"));
  assert.equal(args.at(-1), "out.mp4");
  const silent = subtitleBurnArgs({
    clip: "in.mp4",
    plate: "plate.png",
    out: "out.mp4",
    durationSec: 5,
    fps: 24,
    hasAudio: false,
    aspect: "16:9",
    width: 1920,
    height: 1080,
  });
  assert.ok(!silent.includes("0:a"));
  assert.deepEqual(subtitleFrameSize("1:1"), { width: 1080, height: 1080 });
});

test("export is blocked when a plate row is missing", () => {
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] },
      subtitlePlates: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png" }],
    }),
    true,
  );
  assert.equal(
    subtitleExportBlocked({ subtitleOverlay: true, phaseA: { clips: [{ clipNumber: 1 }] } }),
    true,
  );
});

test("export is blocked while a plate is queued or in progress", () => {
  for (const status of ["queued", "in_progress"]) {
    assert.equal(
      subtitleExportBlocked({
        subtitleOverlay: true,
        phaseA: { clips: [{ clipNumber: 1 }] },
        subtitlePlates: [{ clipNumber: 1, status }],
      }),
      true,
    );
  }
});

test("a completed plate drawn for another line does not count as completed", () => {
  const plates = [
    { clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png", line: "Old line." },
  ];
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1, englishVo: "New line." }] },
      subtitlePlates: plates,
    }),
    true,
  );
  // Same line still passes, and an older row with no `line` stays completed.
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1, englishVo: "Old line." }] },
      subtitlePlates: plates,
    }),
    false,
  );
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1, englishVo: "Anything." }] },
      subtitlePlates: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png" }],
    }),
    false,
  );
});

test("plateLineStale ignores rows with no stored line", () => {
  assert.equal(plateLineStale({}, "x"), false);
  assert.equal(plateLineStale({ line: "a" }, " a "), false);
  assert.equal(plateLineStale({ line: "a" }, "b"), true);
});

test("clipsWithChangedVo lists only clips whose spoken line changed", () => {
  assert.deepEqual(
    clipsWithChangedVo(
      [
        { clipNumber: 1, englishVo: "A." },
        { clipNumber: 2, englishVo: "B." },
      ],
      [
        { clipNumber: 1, englishVo: "A." },
        { clipNumber: 2, englishVo: "B2." },
      ],
    ),
    [2],
  );
});
