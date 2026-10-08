import assert from "node:assert/strict";
import { test } from "node:test";
import { videoPreview, type PreviewSource } from "@/service/mcp/video-preview";

function source(overrides: Partial<PreviewSource> = {}): PreviewSource {
  return {
    id: "v1",
    status: "production",
    aspectRatio: "9:16",
    frames: [],
    clips: [],
    ...overrides,
  };
}

test("preview prefers stored files and groups reel, cover, and final", () => {
  const preview = videoPreview(
    source({
      phaseA: { localizedTitle: "標題", englishTitle: "Title" },
      frames: [
        {
          clipNumber: 1,
          position: "start",
          status: "completed",
          blobUrl: "https://cdn/start.png",
          outputUrl: "https://cdn/start-raw.png",
        },
        { clipNumber: 1, position: "end", status: "failed", error: "timeout" },
      ],
      clips: [
        {
          clipNumber: 1,
          status: "completed",
          durationSeconds: 5,
          outputUrl: "https://cdn/clip.mp4",
        },
      ],
      reelStatus: "completed",
      reelUrl: "https://cdn/reel.mp4",
      coverStatus: "idle",
      coverSafeAreas: ["ig-reel"],
      finalStatus: "queued",
    }),
  );

  assert.equal(preview.title, "標題");
  assert.deepEqual(preview.previewUrls, ["https://cdn/start.png"]);
  assert.equal(preview.frames[0].url, "https://cdn/start.png");
  assert.equal(preview.frames[1].url, null);
  assert.equal(preview.clips[0].url, "https://cdn/clip.mp4");
  assert.equal(preview.reel.url, "https://cdn/reel.mp4");
  assert.deepEqual(preview.cover.safeAreas, ["ig-reel"]);
  assert.equal(preview.final.status, "queued");
  assert.equal(preview.final.url, null);
});
