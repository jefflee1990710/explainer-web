import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SIMPLE_MEDIA_MAX_BYTES,
  validateSimpleMediaFile,
} from "@/service/project/simple-media-validation";

test("validateSimpleMediaFile validates video and audio MIME types and size constraints", () => {
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: 10 * 1024 * 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "audio/mpeg", size: 5 * 1024 * 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "audio/wav", size: 5 * 1024 * 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "image/png", size: 1024 }).ok, false);
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: 60 * 1024 * 1024 }).ok, false);
});

test("validateSimpleMediaFile handles additional supported formats, boundaries and invalid files", () => {
  // Supported video formats
  assert.equal(validateSimpleMediaFile({ type: "video/quicktime", size: 50 * 1024 * 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "video/webm", size: 1024 }).ok, true);

  // Supported audio formats
  assert.equal(validateSimpleMediaFile({ type: "audio/mp3", size: 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "audio/x-m4a", size: 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "audio/m4a", size: 1024 }).ok, true);

  // Boundary checks: 50MB exactly vs 50MB + 1 byte
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: SIMPLE_MEDIA_MAX_BYTES }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: SIMPLE_MEDIA_MAX_BYTES + 1 }).ok, false);

  // Zero / negative size
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: 0 }).ok, false);
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: -10 }).ok, false);

  // Fallback by filename extension
  assert.equal(validateSimpleMediaFile({ type: "application/octet-stream", name: "clip.mp4", size: 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "", name: "voice.m4a", size: 1024 }).ok, true);
});
