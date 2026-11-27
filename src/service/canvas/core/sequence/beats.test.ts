import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasSequenceSchema } from "@/model/canvas-sequence";
import { BEAT_SAMPLE_RATE, detectBeats, placeClips, snapClipsToBeats, timelineBeats } from "@/service/canvas/core/sequence";

// Decaying noise bursts every `60/bpm` seconds over a quiet bed, starting at `offset`.
function clickTrack(bpm: number, seconds: number, offset = 0.2): Float32Array {
  const out = new Float32Array(Math.round(seconds * BEAT_SAMPLE_RATE));
  let seed = 7;
  const noise = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 1073741824 - 1;
  };
  for (let i = 0; i < out.length; i++) out[i] = noise() * 0.01;
  for (let t = offset; t < seconds; t += 60 / bpm) {
    const start = Math.round(t * BEAT_SAMPLE_RATE);
    for (let i = 0; i < 800 && start + i < out.length; i++) out[start + i]! += noise() * Math.exp(-i / 150);
  }
  return out;
}

describe("beat detection", () => {
  for (const bpm of [96, 120, 140]) {
    it(`finds ${bpm} BPM and beats within 40 ms of the clicks`, () => {
      const grid = detectBeats(clickTrack(bpm, 20));
      assert.ok(Math.abs(grid.bpm - bpm) < 2, `bpm ${grid.bpm}`);
      const period = 60 / bpm;
      const inner = grid.beats.filter((b) => b > 1 && b < 19);
      assert.ok(inner.length > 10);
      for (const b of inner) {
        const phase = (((b - 0.2) % period) + period) % period;
        assert.ok(Math.min(phase, period - phase) < 0.04, `beat ${b} off by ${phase}`);
      }
    });
  }

  it("returns no grid for silence or very short audio", () => {
    assert.deepEqual(detectBeats(new Float32Array(BEAT_SAMPLE_RATE * 10)), { bpm: 0, beats: [] });
    assert.deepEqual(detectBeats(clickTrack(120, 1)), { bpm: 0, beats: [] });
  });
});

const seq = (beats: number[], audio: Record<string, unknown> = {}) =>
  canvasSequenceSchema.parse({
    tracks: {
      video: [
        { id: "a", ref: "e1" },
        { id: "b", ref: "e2", outSec: 3.2 },
        { id: "c", ref: "e3" },
      ],
      audio: [{ id: "m", ref: "e4", beats, bpm: 120, ...audio }],
    },
  });

describe("snap to beats", () => {
  const durations = { e1: 2.3, e2: 6, e3: 2.6, e4: 30 };

  it("maps beats onto the timeline with the item's start, in point, and loop", () => {
    const item = seq([0.5, 1, 1.5, 2], { startSec: 1, inSec: 0.5, loop: true, outSec: 2 }).tracks.audio[0]!;
    assert.deepEqual(timelineBeats(item, 4), [1, 1.5, 2, 2.5, 3, 3.5, 4]);
  });

  it("moves each cut to the nearest reachable beat", () => {
    const beats = Array.from({ length: 30 }, (_, i) => i * 0.5);
    const { seq: next, moved } = snapClipsToBeats(seq(beats), durations, "m");
    const placed = placeClips(next, durations);
    // a: 2.3 → 2.0 (cannot grow past its 2.3 s source to 2.5).
    assert.equal(placed[0]!.end, 2);
    // b: ends 2.0 + 3.2 = 5.2 → 5.0.
    assert.equal(placed[1]!.end, 5);
    // c: 5.0 + 2.6 = 7.6 → 7.5.
    assert.equal(placed[2]!.end, 7.5);
    assert.equal(moved, 3);
    // Already on beats: nothing moves.
    assert.equal(snapClipsToBeats(next, durations, "m").moved, 0);
  });

  it("does nothing without a beat grid", () => {
    const plain = seq([]);
    assert.equal(snapClipsToBeats(plain, durations, "m").seq, plain);
  });
});
