import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasNode } from "@/model/canvas";
import { parseKeepRanges, mergeRanges, totalRangeSec } from "@/service/canvas/core/edit-ranges";
import { mergeCanvasNodeSnapshots } from "@/service/canvas/core/graph";
import {
  carryMediaMeta,
  currentMediaMeta,
  isUsableProbe,
  mediaMetaFromProbe,
  nodesMissingMediaMeta,
  parseMediaProbe,
} from "@/service/canvas/core/media-meta";

const STDERR = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'a.mp4':
  Duration: 00:00:12.48, start: 0.000000, bitrate: 1200 kb/s
  Stream #0:0[0x1](und): Video: h264 (High), yuv420p(progressive), 1080x1920 [SAR 1:1 DAR 9:16], 30 fps
  Stream #0:1[0x2](und): Audio: aac (LC), 48000 Hz, stereo, fltp, 128 kb/s`;

function videoNode(url: string, meta?: CanvasNode["data"]["outputMeta"]): CanvasNode {
  return {
    id: "v",
    type: "model",
    position: { x: 0, y: 0 },
    data: { label: "v", modelId: "openrouter:minimax/hailuo-3", outputKind: "video", outputUrl: url, ...(meta ? { outputMeta: meta } : {}) },
  };
}

describe("media meta", () => {
  it("parses duration, size, and audio", () => {
    const probe = parseMediaProbe(STDERR);
    assert.deepEqual(probe, { hasAudio: true, hasVideo: true, durationSec: 12.48, width: 1080, height: 1920 });
    assert.deepEqual(mediaMetaFromProbe("u", probe), { url: "u", durationSec: 12.48, hasAudio: true, width: 1080, height: 1920 });
  });

  it("leaves duration unknown instead of guessing", () => {
    const probe = parseMediaProbe("Input #0, mp3\n  Duration: N/A\n  Stream #0:0: Audio: mp3");
    assert.equal(probe.durationSec, undefined);
    assert.equal(isUsableProbe(probe), true);
    assert.equal(isUsableProbe(parseMediaProbe("garbage")), false);
  });

  it("only trusts meta for the current file", () => {
    assert.equal(currentMediaMeta(videoNode("https://a", { url: "https://old", durationSec: 3 })), undefined);
    assert.equal(currentMediaMeta(videoNode("https://a", { url: "https://a", durationSec: 3 }))?.durationSec, 3);
    assert.deepEqual(nodesMissingMediaMeta([videoNode("https://a", { url: "https://old" })]).map((n) => n.id), ["v"]);
  });

  it("keeps saved meta when a client save omits it", () => {
    const server = videoNode("https://a", { url: "https://a", durationSec: 6, hasAudio: true });
    const client = videoNode("https://a");
    assert.equal(carryMediaMeta(server.data, client.data, "model").outputMeta?.durationSec, 6);
    const [merged] = mergeCanvasNodeSnapshots([server], [client]);
    assert.equal(merged!.data.outputMeta?.durationSec, 6);
    const replaced = mergeCanvasNodeSnapshots([server], [videoNode("https://b")]);
    assert.equal(replaced[0]!.data.outputMeta, undefined);
  });
});

describe("edit ranges", () => {
  it("parses seconds and clock times and clips to the clip length", () => {
    assert.deepEqual(parseKeepRanges("0-3, 0:08-0:12", 10), [
      { start: 0, end: 3 },
      { start: 8, end: 10 },
    ]);
    assert.throws(() => parseKeepRanges("12-14", 10), /沒有落在/);
    assert.equal(totalRangeSec(mergeRanges([{ start: 0, end: 4 }, { start: 3, end: 6 }])), 6);
  });
});
