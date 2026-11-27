// Pure: finds the beat grid of a music track and snaps Sequence cuts onto it.

import type { CanvasSequence, SequenceAudio } from "@/model/canvas-sequence";
import { audioItemSec, placeClips, sequenceTotalSec, type SequenceDurations } from "@/service/canvas/core/sequence/timeline";

export const BEAT_SAMPLE_RATE = 11025;
const FRAME = 1024;
const HOP = 256;
const MIN_BPM = 60;
const MAX_BPM = 180;
// Tempo prior centred on 120 BPM, so a half or double tempo only wins on clear evidence.
const PRIOR_BPM = 120;
const PRIOR_WIDTH_OCTAVES = 1;

export type BeatGrid = { bpm: number; beats: number[] };

const round3 = (v: number) => Math.round(v * 1000) / 1000;

// Onset strength per hop: rise in log energy, minus its local average.
function onsetEnvelope(samples: Float32Array): Float32Array {
  const frames = Math.max(0, Math.floor((samples.length - FRAME) / HOP) + 1);
  const logEnergy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * HOP; i < f * HOP + FRAME; i++) sum += samples[i]! * samples[i]!;
    logEnergy[f] = Math.log1p((sum / FRAME) * 1000);
  }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, logEnergy[f]! - logEnergy[f - 1]!);
  // Subtract a ~0.4 s moving average so sustained loud parts do not read as onsets.
  const half = Math.round((0.2 * BEAT_SAMPLE_RATE) / HOP);
  const env = new Float32Array(frames);
  let acc = 0;
  for (let f = 0; f < Math.min(frames, half); f++) acc += flux[f]!;
  for (let f = 0; f < frames; f++) {
    if (f + half < frames) acc += flux[f + half]!;
    if (f - half - 1 >= 0) acc -= flux[f - half - 1]!;
    const count = Math.min(frames - 1, f + half) - Math.max(0, f - half) + 1;
    env[f] = Math.max(0, flux[f]! - acc / count);
  }
  return env;
}

// Mono PCM at BEAT_SAMPLE_RATE → tempo and beat times (seconds). Empty for silence or very short audio.
export function detectBeats(samples: Float32Array, sampleRate = BEAT_SAMPLE_RATE): BeatGrid {
  const env = onsetEnvelope(samples);
  const fps = sampleRate / HOP;
  const minLag = Math.floor((60 * fps) / MAX_BPM);
  const maxLag = Math.ceil((60 * fps) / MIN_BPM);
  const energy = env.reduce((a, b) => a + b, 0);
  if (env.length < maxLag * 4 || energy <= 1e-6) return { bpm: 0, beats: [] };

  // Tempo: autocorrelation of a smoothed envelope (so a fractional period still lines up),
  // weighted by the tempo prior.
  const smooth = new Float32Array(env.length);
  const kernel = [1, 2, 3, 2, 1];
  for (let f = 0; f < env.length; f++) {
    let sum = 0;
    for (let k = -2; k <= 2; k++) sum += (env[f + k] ?? 0) * kernel[k + 2]!;
    smooth[f] = sum / 9;
  }
  const score = (lag: number) => {
    let sum = 0;
    for (let f = lag; f < smooth.length; f++) sum += smooth[f]! * smooth[f - lag]!;
    return sum / (smooth.length - lag);
  };
  let bestLag = minLag;
  let best = -Infinity;
  const raw = new Map<number, number>();
  for (let lag = minLag; lag <= maxLag; lag++) {
    const value = score(lag);
    raw.set(lag, value);
    const bpm = (60 * fps) / lag;
    const weight = Math.exp(-0.5 * (Math.log2(bpm / PRIOR_BPM) / PRIOR_WIDTH_OCTAVES) ** 2);
    if (value * weight > best) {
      best = value * weight;
      bestLag = lag;
    }
  }
  // Parabolic refinement for a fractional period.
  const a = raw.get(bestLag - 1);
  const b = raw.get(bestLag)!;
  const c = raw.get(bestLag + 1);
  let period = bestLag;
  if (a !== undefined && c !== undefined && a - 2 * b + c !== 0) {
    period += Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / (a - 2 * b + c)));
  }

  // Phase: the offset whose comb collects the most onset strength.
  let phase = 0;
  let bestPhase = -Infinity;
  for (let p = 0; p < Math.ceil(period); p++) {
    let sum = 0;
    for (let t = p; t < env.length; t += period) sum += env[Math.round(t)] ?? 0;
    if (sum > bestPhase) {
      bestPhase = sum;
      phase = p;
    }
  }

  // Each beat snaps to the strongest onset within ±10% of a period.
  const reach = Math.max(1, Math.round(period * 0.1));
  const beats: number[] = [];
  for (let t = phase; t < env.length; t += period) {
    const centre = Math.round(t);
    let at = centre;
    for (let f = Math.max(0, centre - reach); f <= Math.min(env.length - 1, centre + reach); f++) {
      if (env[f]! > env[at]!) at = f;
    }
    // Onset frame f covers samples from f*HOP; its rise is centred about one frame later.
    beats.push(round3(((at + 0.5) * HOP + FRAME / 2) / sampleRate));
  }
  return { bpm: Math.round(((60 * fps) / period) * 10) / 10, beats };
}

// Beat times of one audio item, in timeline seconds, up to `untilSec`.
export function timelineBeats(item: SequenceAudio, untilSec: number, sourceSec?: number): number[] {
  const beats = item.beats ?? [];
  if (!beats.length) return [];
  const playable = beats.filter((b) => b >= item.inSec && (item.outSec === undefined || b <= item.outSec));
  const loopLen = item.loop ? (item.outSec ?? sourceSec ?? 0) - item.inSec : 0;
  const end = Math.min(untilSec, item.loop ? untilSec : item.startSec + audioItemSec(item, sourceSec, untilSec));
  const out: number[] = [];
  for (let offset = 0; ; offset += loopLen) {
    let added = false;
    for (const b of playable) {
      const t = round3(item.startSec + offset + (b - item.inSec));
      if (t > end) break;
      // A beat on the loop point is shared by both passes.
      if (out.length && Math.abs(out[out.length - 1]! - t) < 0.01) continue;
      out.push(t);
      added = true;
    }
    if (!item.loop || loopLen <= 0.5 || !added) break;
  }
  return out;
}

// Moves each clip's out point so its cut lands on the nearest beat. Clips never get shorter than
// `minClipSec` and only grow when the source length is known.
export function snapClipsToBeats(
  seq: CanvasSequence,
  durations: SequenceDurations,
  audioId: string,
  minClipSec = 0.5,
): { seq: CanvasSequence; moved: number } {
  const item = seq.tracks.audio.find((a) => a.id === audioId);
  if (!item?.beats?.length) return { seq, moved: 0 };
  // Allow some growth past the current end when clips extend.
  const horizon = sequenceTotalSec(seq, durations) * 1.5 + 60;
  const beats = timelineBeats(item, horizon, durations[item.ref]);
  let next = seq;
  let moved = 0;
  for (let i = 0; i < next.tracks.video.length; i++) {
    const placed = placeClips(next, durations)[i]!;
    const clip = placed.clip;
    const speed = clip.speed || 1;
    const sourceSec = durations[clip.ref];
    const len = placed.end - placed.start;
    if (len <= 0) continue;
    const maxEnd = sourceSec !== undefined ? placed.start + (sourceSec - placed.inSec) / speed : placed.end;
    const candidates = beats.filter((b) => b >= placed.start + minClipSec && b <= maxEnd + 1e-6);
    if (!candidates.length) continue;
    const target = candidates.reduce((bestBeat, b) => (Math.abs(b - placed.end) < Math.abs(bestBeat - placed.end) ? b : bestBeat));
    if (Math.abs(target - placed.end) < 0.01) continue;
    const outSec = round3(placed.inSec + (target - placed.start) * speed);
    const video = next.tracks.video.map((c, j) => (j === i ? { ...c, outSec } : c));
    next = { ...next, tracks: { ...next.tracks, video } };
    moved += 1;
  }
  return { seq: next, moved };
}
