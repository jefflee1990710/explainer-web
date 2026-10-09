import assert from "node:assert/strict";
import test from "node:test";
import { emptyEdit, type VideoEdit } from "@/model/video-edit";
import { exportPhases } from "@/presentation/components/app/projects/new/browser-video-export";

const logo: VideoEdit["layers"][number] = {
  id: "logo",
  kind: "image",
  assetUrl: "https://blob/logo.png",
  anchor: "top-right",
  marginPct: 4,
  widthPct: 18,
  opacity: 1,
};

test("a plain reel skips the final render", () => {
  assert.deepEqual(exportPhases(1, emptyEdit()), ["download", "save"]);
  assert.deepEqual(exportPhases(4, emptyEdit()), ["encoder", "join", "save"]);
});

const outro = { kind: "image" as const, assetUrl: "https://blob/end.png", durationSec: 2 };

test("bookends join with the clips and do not add a render step", () => {
  assert.deepEqual(exportPhases(3, { ...emptyEdit(), outro }), ["encoder", "join", "save"]);
  assert.deepEqual(exportPhases(1, { ...emptyEdit(), intro: outro }), ["encoder", "join", "save"]);
});

test("a logo still renders once, after any bookends are joined", () => {
  assert.deepEqual(exportPhases(1, { ...emptyEdit(), layers: [logo] }), [
    "encoder",
    "download",
    "encode",
    "save",
  ]);
  assert.deepEqual(exportPhases(3, { ...emptyEdit(), layers: [logo], outro }), [
    "encoder",
    "join",
    "download",
    "encode",
    "save",
  ]);
});
