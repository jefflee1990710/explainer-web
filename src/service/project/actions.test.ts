import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSimpleVideoClipDraft } from "@/service/project/actions";

test("buildSimpleVideoClipDraft preserves referenceVideoUrl and referenceAudioUrl on clip and project payload", () => {
  const result = buildSimpleVideoClipDraft({
    prompt: "Camera tracking shot",
    refVideoUrl: "https://blob.example.com/ref.mp4",
    refAudioUrl: "https://blob.example.com/ref.mp3",
    durationSeconds: 6,
  });
  assert.equal(result.clip.referenceVideoUrl, "https://blob.example.com/ref.mp4");
  assert.equal(result.clip.referenceAudioUrl, "https://blob.example.com/ref.mp3");
  assert.equal(result.projectPayload.referenceVideoUrl, "https://blob.example.com/ref.mp4");
  assert.equal(result.projectPayload.referenceAudioUrl, "https://blob.example.com/ref.mp3");
  assert.equal(result.referenceVideoUrl, "https://blob.example.com/ref.mp4");
  assert.equal(result.referenceAudioUrl, "https://blob.example.com/ref.mp3");
});

test("buildSimpleVideoClipDraft adjusts prompts when audio reference is present vs absent", () => {
  const withoutAudio = buildSimpleVideoClipDraft({
    prompt: "A neon lit cyberpunk street",
    durationSeconds: 6,
  });
  assert.equal(withoutAudio.clip.referenceVideoUrl, undefined);
  assert.equal(withoutAudio.clip.referenceAudioUrl, undefined);
  assert.match(withoutAudio.clip.explainerScene, /NO lip-sync/);
  assert.match(withoutAudio.clip.motionCamera, /lips stay closed/);

  const withAudio = buildSimpleVideoClipDraft({
    prompt: "A narrator talking in front of a neon sign",
    refAudioUrl: "https://blob.example.com/voice.mp3",
    durationSeconds: 8,
  });
  assert.equal(withAudio.clip.referenceAudioUrl, "https://blob.example.com/voice.mp3");
  assert.match(withAudio.clip.explainerScene, /lip sync matching audio/i);
  assert.match(withAudio.clip.motionCamera, /matching audio/i);
});

test("buildSimpleVideoClipDraft filters invalid or empty reference URLs and clamps duration", () => {
  const result = buildSimpleVideoClipDraft({
    prompt: "Futuristic spaceship cockpit",
    refVideoUrl: "not-a-valid-url",
    refAudioUrl: "   ",
    durationSeconds: 20, // should clamp to 12
  });
  assert.equal(result.clip.referenceVideoUrl, undefined);
  assert.equal(result.clip.referenceAudioUrl, undefined);
  assert.equal(result.clip.durationSeconds, 12);
  assert.equal(result.durationSeconds, 12);

  const clampedLow = buildSimpleVideoClipDraft({
    prompt: "Action sprint",
    durationSeconds: 2, // should clamp to 5
  });
  assert.equal(clampedLow.clip.durationSeconds, 5);
  assert.equal(clampedLow.durationSeconds, 5);
});
