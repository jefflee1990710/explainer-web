import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layerPlacement,
  overlayPosition,
  placementFromDrag,
  placementStyle,
  widthPctFromBox,
} from "@/service/video-edit/layer-placement";

const layer = { anchor: "top-right" as const, marginPct: 4, widthPct: 20 };

test("layerPlacement scales width by frame width and margin by the short side", () => {
  assert.deepEqual(layerPlacement(layer, 1080, 1920), { anchor: "top-right", w: 216, margin: 43 });
  assert.deepEqual(layerPlacement(layer, 1920, 1080), { anchor: "top-right", w: 384, margin: 43 });
});

test("layerPlacement keeps width even and clamps out-of-range values", () => {
  assert.equal(layerPlacement({ ...layer, widthPct: 10.1 }, 1080, 1920).w, 108);
  assert.equal(layerPlacement({ ...layer, widthPct: 500 }, 1080, 1920).w, 1080);
  assert.equal(layerPlacement({ ...layer, marginPct: 90 }, 1080, 1920).margin, 216);
});

test("overlayPosition covers all five anchors", () => {
  const p = (anchor: Parameters<typeof overlayPosition>[0]["anchor"]) =>
    overlayPosition({ anchor, w: 100, margin: 20 });
  assert.deepEqual(p("top-left"), { x: "20", y: "20" });
  assert.deepEqual(p("top-right"), { x: "main_w-overlay_w-20", y: "20" });
  assert.deepEqual(p("bottom-left"), { x: "20", y: "main_h-overlay_h-20" });
  assert.deepEqual(p("bottom-right"), { x: "main_w-overlay_w-20", y: "main_h-overlay_h-20" });
  assert.deepEqual(p("center"), { x: "(main_w-overlay_w)/2", y: "(main_h-overlay_h)/2" });
});

test("placementStyle mirrors the anchor with CSS offsets", () => {
  assert.deepEqual(placementStyle({ anchor: "bottom-right", w: 100, margin: 20 }), {
    width: 100,
    bottom: 20,
    right: 20,
  });
  assert.deepEqual(placementStyle({ anchor: "center", w: 80, margin: 20 }), {
    width: 80,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  });
});

test("placementFromDrag snaps to the nearest corner or the centre", () => {
  const frame = { frameW: 400, frameH: 800, boxW: 80, boxH: 40 };
  assert.deepEqual(placementFromDrag({ ...frame, left: 300, top: 20 }), { anchor: "top-right", marginPct: 5 });
  assert.deepEqual(placementFromDrag({ ...frame, left: 10, top: 740 }), { anchor: "bottom-left", marginPct: 2.5 });
  assert.deepEqual(placementFromDrag({ ...frame, left: 160, top: 380 }), { anchor: "center", marginPct: 0 });
  assert.equal(placementFromDrag({ ...frame, left: 150, top: 200 }).marginPct, 20);
});

test("widthPctFromBox clamps to 2–100", () => {
  assert.equal(widthPctFromBox(100, 400), 25);
  assert.equal(widthPctFromBox(1, 400), 2);
  assert.equal(widthPctFromBox(900, 400), 100);
});
