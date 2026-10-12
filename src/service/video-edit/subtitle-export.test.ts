import assert from "node:assert/strict";
import { test } from "node:test";
import { subtitleBurnArgs, subtitleExportBlocked, subtitleFrameSize } from "@/service/video-edit/subtitle-export";

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
