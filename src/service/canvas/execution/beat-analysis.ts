// Decodes a canvas music file to mono PCM with FFmpeg and finds its beat grid. Free; nothing is
// stored here — the caller writes the grid onto the Sequence audio item.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BEAT_SAMPLE_RATE, detectBeats, type BeatGrid } from "@/service/canvas/core/sequence/beats";
import { assertAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";
import { runFfmpeg } from "@/service/reel/concat";

// Only the first 10 minutes are analysed (the Sequence render cap).
const MAX_ANALYSE_SEC = 600;
const DECODE_TIMEOUT_MS = 90_000;

export type BeatAnalysisDeps = { decode: (url: string) => Promise<Float32Array> };

export function beatDecodeArgs(url: string, output: string): string[] {
  return [
    "-y",
    "-protocol_whitelist",
    "file,http,https,tcp,tls",
    "-i",
    url,
    "-t",
    String(MAX_ANALYSE_SEC),
    "-vn",
    "-ac",
    "1",
    "-ar",
    String(BEAT_SAMPLE_RATE),
    "-f",
    "f32le",
    output,
  ];
}

const defaultDeps: BeatAnalysisDeps = {
  decode: async (url) => {
    const dir = await mkdtemp(join(tmpdir(), "canvas-beats-"));
    try {
      await runFfmpeg(dir, beatDecodeArgs(url, "audio.pcm"), DECODE_TIMEOUT_MS);
      const buf = await readFile(join(dir, "audio.pcm"));
      // Copy into an aligned buffer; Node Buffers can start at any byte offset.
      const aligned = new ArrayBuffer(buf.length - (buf.length % 4));
      new Uint8Array(aligned).set(buf.subarray(0, aligned.byteLength));
      return new Float32Array(aligned);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
};

export async function analyzeAudioBeats(url: string, deps: Partial<BeatAnalysisDeps> = {}): Promise<BeatGrid> {
  // SSRF guard: only canvas storage is fetched.
  assertAllowedCanvasMediaUrl(url);
  const samples = await { ...defaultDeps, ...deps }.decode(url);
  return detectBeats(samples, BEAT_SAMPLE_RATE);
}
