import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeAudioBeats, beatDecodeArgs } from "@/service/canvas/execution/beat-analysis";

describe("beat analysis", () => {
  it("refuses URLs outside canvas storage before decoding", async () => {
    let decoded = false;
    await assert.rejects(
      analyzeAudioBeats("http://10.0.0.1/song.mp3", {
        decode: async () => {
          decoded = true;
          return new Float32Array(0);
        },
      }),
    );
    assert.equal(decoded, false);
  });

  it("decodes mono 11025 Hz PCM, capped at 10 minutes, with limited protocols", () => {
    const args = beatDecodeArgs("https://x.public.blob.vercel-storage.com/s.mp3", "a.pcm");
    assert.equal(args[args.indexOf("-ar") + 1], "11025");
    assert.equal(args[args.indexOf("-t") + 1], "600");
    assert.equal(args[args.indexOf("-protocol_whitelist") + 1], "file,http,https,tcp,tls");
  });

  it("returns an empty grid for silent audio", async () => {
    const grid = await analyzeAudioBeats("https://x.public.blob.vercel-storage.com/s.mp3", {
      decode: async () => new Float32Array(11025 * 8),
    });
    assert.deepEqual(grid, { bpm: 0, beats: [] });
  });
});
