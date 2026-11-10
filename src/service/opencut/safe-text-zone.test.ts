import assert from "node:assert/strict";
import test from "node:test";
import { computeCenteredFaceSafeBox } from "./safe-text-zone";

test("computeCenteredFaceSafeBox centers horizontally and shifts below a central upper face", async () => {
  const width = 320;
  const height = 320;
  const rgba = Buffer.alloc(width * height * 4, 40);
  const faceMask = new Uint8Array(width * height);

  // Place a face in the upper-middle region (x: 110..210, y: 50..150)
  for (let y = 50; y < 150; y++) {
    for (let x = 110; x < 210; x++) {
      faceMask[y * width + x] = 1;
    }
  }

  const res = computeCenteredFaceSafeBox({
    rgba,
    width,
    height,
    faceMask,
  });

  // Box center X should be close to horizontal center (0.42..0.58)
  const cx = (res.bestBox.x + res.bestBox.w / 2) / width;
  const cy = (res.bestBox.y + res.bestBox.h / 2) / height;
  assert.ok(cx >= 0.42 && cx <= 0.58, `expected centered cx, got ${cx}`);
  // Since the face is at y=50..150 (0.15..0.47), the box should sit below the face (cy > 0.55)
  assert.ok(cy >= 0.55 && cy <= 0.82, `expected lower-middle cy avoiding face, got ${cy}`);
  assert.ok(res.bestBox.y >= 144, `expected box top >= 144 to avoid face, got ${res.bestBox.y}`);

  const maskBuf = await res.maskPngBuffer;
  assert.ok(maskBuf.length > 100);
});

test("computeCenteredFaceSafeBox avoids corners and centers when no face is present", () => {
  const width = 320;
  const height = 320;
  const rgba = Buffer.alloc(width * height * 4, 30);
  const faceMask = new Uint8Array(width * height);

  const res = computeCenteredFaceSafeBox({
    rgba,
    width,
    height,
    faceMask,
  });

  const cx = (res.bestBox.x + res.bestBox.w / 2) / width;
  const cy = (res.bestBox.y + res.bestBox.h / 2) / height;
  assert.ok(Math.abs(cx - 0.5) <= 0.08, `expected horizontally centered cx, got ${cx}`);
  assert.ok(cy >= 0.28 && cy <= 0.72, `expected non-corner vertical band, got ${cy}`);
});
