import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import {
  closestSectionRatio,
  mergeSourceVideoMeasure,
  sectionFromSourceVideo,
  sourceVideoFromNode,
} from "@/app/app/canvas/nodes/source-video-section";

type Probe = { width: number; height: number; duration: number; start: number };

function probeFile(path: string): Probe {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration,start_time",
      "-of",
      "json",
      path,
    ],
    { encoding: "utf8" },
  );
  const stream = JSON.parse(raw).streams[0] as {
    width: number;
    height: number;
    duration: string;
    start_time?: string;
  };
  return {
    width: stream.width,
    height: stream.height,
    duration: Number(stream.duration),
    start: Number(stream.start_time ?? 0),
  };
}

function renderFixture(path: string, size: string, seconds: number) {
  execFileSync(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", `color=c=black:s=${size}:d=${seconds}`, "-pix_fmt", "yuv420p", path],
    { stdio: "ignore" },
  );
}

describe("sectionFromSourceVideo", () => {
  it("reads a real 16:9 file as start 0, its duration, and 16:9", () => {
    const file = probeFile("public/hero/tools/scroswap/center.mp4");
    const section = sectionFromSourceVideo({
      durationSeconds: file.duration,
      width: file.width,
      height: file.height,
      inPointSeconds: file.start,
    });
    assert.deepEqual(section, { start: 0, length: 5, ratio: "16:9" });
    assert.equal(closestSectionRatio(file.width, file.height), "16:9");
  });

  it("maps generated 9:16, 1:1, and 4:3 fixtures onto the existing choices", () => {
    const dir = mkdtempSync(join(tmpdir(), "source-section-"));
    const portrait = join(dir, "portrait.mp4");
    const square = join(dir, "square.mp4");
    const fourThree = join(dir, "four-three.mp4");
    renderFixture(portrait, "1080x1920", 3.24);
    renderFixture(square, "720x720", 2);
    renderFixture(fourThree, "1440x1080", 8);
    const tall = probeFile(portrait);
    const box = probeFile(square);
    const wide = probeFile(fourThree);
    assert.deepEqual(
      sectionFromSourceVideo({ durationSeconds: tall.duration, width: tall.width, height: tall.height, inPointSeconds: tall.start }),
      { start: 0, length: 3.2, ratio: "9:16" },
    );
    assert.equal(
      sectionFromSourceVideo({ durationSeconds: box.duration, width: box.width, height: box.height })?.ratio,
      "1:1",
    );
    assert.equal(
      sectionFromSourceVideo({ durationSeconds: wide.duration, width: wide.width, height: wide.height })?.ratio,
      "1:1",
    );
  });

  it("uses a stored in-point and otherwise starts at 0", () => {
    assert.equal(
      sectionFromSourceVideo({ durationSeconds: 8, width: 1080, height: 1920, inPointSeconds: 1.24 })?.start,
      1.2,
    );
    assert.equal(
      sectionFromSourceVideo({ durationSeconds: 8, width: 1080, height: 1920, inPointSeconds: 0.04 })?.start,
      0,
    );
    assert.equal(sectionFromSourceVideo({ durationSeconds: 8, aspectRatio: "9:16" })?.start, 0);
  });

  it("does not guess when there is no video measure", () => {
    assert.equal(sectionFromSourceVideo(undefined), undefined);
    assert.equal(sectionFromSourceVideo({}), undefined);
    assert.equal(sectionFromSourceVideo({ durationSeconds: 6 }), undefined);
    assert.equal(sectionFromSourceVideo({ width: 1080, height: 1920 }), undefined);
    assert.equal(sourceVideoFromNode(undefined), undefined);
    const image: CanvasNode = {
      id: "img",
      type: "media",
      position: { x: 0, y: 0 },
      data: { mediaKind: "image", mediaUrl: "https://x/a.png" },
    };
    const empty: CanvasNode = {
      id: "vid",
      type: "media",
      position: { x: 0, y: 0 },
      data: { mediaKind: "video", mediaUrl: "  " },
    };
    assert.equal(sourceVideoFromNode(image), undefined);
    assert.equal(sourceVideoFromNode(empty), undefined);
  });

  it("keeps a source node's in-point ahead of a probed start of 0", () => {
    const clip: CanvasNode = {
      id: "clip",
      type: "model",
      position: { x: 0, y: 0 },
      data: {
        outputKind: "video",
        outputUrl: "https://x/clip.mp4",
        durationSeconds: 9,
        aspectRatio: "4:3",
        toolParams: { ffmpegStartSec: 2 },
      },
    };
    const stored = sourceVideoFromNode(clip);
    assert.equal(stored?.url, "https://x/clip.mp4");
    const merged = mergeSourceVideoMeasure(stored?.measure, {
      durationSeconds: 9,
      width: 1440,
      height: 1080,
      inPointSeconds: 0,
    });
    assert.deepEqual(sectionFromSourceVideo(merged), { start: 2, length: 9, ratio: "1:1" });
  });
});
