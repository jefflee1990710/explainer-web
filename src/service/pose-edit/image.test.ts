import assert from "node:assert/strict";
import test from "node:test";
import { POSE_EDIT_MAX_BYTES, sniffPoseEditImage } from "@/service/pose-edit/image";

test("sniffPoseEditImage accepts jpeg, png, and webp magic bytes", () => {
  assert.equal(sniffPoseEditImage(Uint8Array.of(0xff, 0xd8, 0xff, 0x00)), "image/jpeg");
  assert.equal(sniffPoseEditImage(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0)), "image/png");
  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(sniffPoseEditImage(webp), "image/webp");
  assert.equal(sniffPoseEditImage(Uint8Array.of(0, 1, 2, 3)), null);
  assert.equal(POSE_EDIT_MAX_BYTES, 8 * 1024 * 1024);
});
