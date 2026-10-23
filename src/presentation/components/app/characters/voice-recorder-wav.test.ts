import assert from "node:assert/strict";
import { test } from "node:test";
import {
  downsampleMonoFloat32,
  encodeMonoPcmWav,
  formatRecordingClock,
  RECORDER_TARGET_SAMPLE_RATE,
  VOICE_READING_SCRIPTS,
} from "@/presentation/components/app/characters/voice-recorder-wav";

test("encodeMonoPcmWav builds a valid 16-bit mono RIFF WAVE buffer with exact sample count", () => {
  const sampleRate = 24000;
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const wav = encodeMonoPcmWav(samples, sampleRate);
  assert.equal(wav.byteLength, 44 + samples.length * 2);

  const view = new DataView(wav);
  const riff = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  const wave = String.fromCharCode(
    view.getUint8(8),
    view.getUint8(9),
    view.getUint8(10),
    view.getUint8(11),
  );
  assert.equal(riff, "RIFF");
  assert.equal(wave, "WAVE");
  assert.equal(view.getUint16(22, true), 1); // mono
  assert.equal(view.getUint32(24, true), sampleRate);
  assert.equal(view.getUint16(34, true), 16); // 16-bit
  assert.equal(view.getUint32(40, true), samples.length * 2);
  assert.equal(view.getInt16(44, true), 0);
  assert.equal(view.getInt16(44 + 6, true), 32767);
  assert.equal(view.getInt16(44 + 8, true), -32768);
});

test("downsampleMonoFloat32 downsamples 48kHz audio to 24kHz", () => {
  const input = new Float32Array(4800);
  for (let i = 0; i < input.length; i++) {
    input[i] = Math.sin(i * 0.05);
  }
  const result = downsampleMonoFloat32(input, 48000, RECORDER_TARGET_SAMPLE_RATE);
  assert.equal(result.sampleRate, 24000);
  assert.equal(result.samples.length, 2400);
});

test("formatRecordingClock and VOICE_READING_SCRIPTS cover all supported languages", () => {
  assert.equal(formatRecordingClock(0), "00:00");
  assert.equal(formatRecordingClock(5), "00:05");
  assert.equal(formatRecordingClock(65), "01:05");
  for (const [lang, list] of Object.entries(VOICE_READING_SCRIPTS)) {
    assert.ok(list.length >= 2, `Expected at least 2 reading scripts for ${lang}`);
  }
});
