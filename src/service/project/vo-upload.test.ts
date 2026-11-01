import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAllowedVoAudioMime,
  parseUploadedVoInput,
  splitTranscriptIntoSubtitleCues,
} from "@/service/project/vo-upload";

test("isAllowedVoAudioMime accepts MP3, WAV, M4A, WebM, and OGG audio files including codec suffixes", () => {
  assert.equal(isAllowedVoAudioMime("audio/mpeg"), true);
  assert.equal(isAllowedVoAudioMime("audio/wav"), true);
  assert.equal(isAllowedVoAudioMime("audio/mp4"), true);
  assert.equal(isAllowedVoAudioMime("audio/x-m4a"), true);
  assert.equal(isAllowedVoAudioMime("audio/webm;codecs=opus"), true);
  assert.equal(isAllowedVoAudioMime("audio/mp4; codecs=mp4a.40.2"), true);
  assert.equal(isAllowedVoAudioMime("image/png"), false);
});

test("parseUploadedVoInput validates brand asset URL and clamps duration between 5s and 120s", () => {
  const valid = parseUploadedVoInput(
    "https://store.public.blob.vercel-storage.com/explainer/brand/u1/vo-123.mp3",
    "18.4",
    (url) => url.includes("/explainer/brand/u1/"),
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(
      valid.url,
      "https://store.public.blob.vercel-storage.com/explainer/brand/u1/vo-123.mp3",
    );
    assert.equal(valid.durationSeconds, 19);
  }

  const invalidHost = parseUploadedVoInput(
    "https://evil.example.com/vo.mp3",
    "10",
    (url) => url.includes("/explainer/brand/u1/"),
  );
  assert.equal(invalidHost.ok, false);

  const empty = parseUploadedVoInput("", "", () => true);
  assert.equal(empty.ok, true);
  if (empty.ok) {
    assert.equal(empty.url, undefined);
    assert.equal(empty.durationSeconds, undefined);
  }
});

test("splitTranscriptIntoSubtitleCues splits by punctuation and strips punctuation marks", () => {
  const cues = splitTranscriptIntoSubtitleCues(
    "落手做先知道咁花時間！有嘢想講啫，又要分鏡又要研究prompt。用 Scro.io 幫你搞掂晒！",
  );
  assert.deepEqual(cues, [
    "落手做先知道咁花時間",
    "有嘢想講啫",
    "又要分鏡又要研究prompt",
    "用 Scro.io 幫你搞掂晒",
  ]);
});
