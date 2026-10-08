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

test("layers and bookends still render once", () => {
  assert.deepEqual(exportPhases(1, { ...emptyEdit(), layers: [logo] }), [
    "encoder",
    "download",
    "encode",
    "save",
  ]);
  assert.ok(
    exportPhases(3, {
      ...emptyEdit(),
      outro: { kind: "image", assetUrl: "https://blob/end.png", durationSec: 2 },
    }).includes("encode"),
  );
});
