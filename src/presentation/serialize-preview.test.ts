import assert from "node:assert/strict";
import { test } from "node:test";
import { previewUrlsFromVideo, type PublicVideo } from "@/presentation/serialize";

function video(partial: Partial<PublicVideo>): PublicVideo {
  return { frames: [], ...partial } as PublicVideo;
}

test("preview strip prefers start frames in clip order", () => {
  const urls = previewUrlsFromVideo(
    video({
      frames: [
        { clipNumber: 2, position: "end", status: "completed", blobUrl: "e2" },
        { clipNumber: 2, position: "start", status: "completed", blobUrl: "s2" },
        { clipNumber: 1, position: "start", status: "completed", blobUrl: "s1" },
        { clipNumber: 1, position: "end", status: "completed", blobUrl: "e1" },
      ],
    } as Partial<PublicVideo>),
  );
  assert.deepEqual(urls, ["s1", "s2", "e1", "e2"]);
});

test("preview strip skips unfinished frames and falls back to the still", () => {
  const urls = previewUrlsFromVideo(
    video({
      characterStillUrl: "still",
      frames: [
        { clipNumber: 1, position: "start", status: "in_progress" },
        { clipNumber: 1, position: "end", status: "completed", outputUrl: "e1" },
      ],
    } as Partial<PublicVideo>),
  );
  assert.deepEqual(urls, ["e1", "still"]);
});

test("preview strip caps unique urls", () => {
  const urls = previewUrlsFromVideo(
    video({
      frames: [1, 2, 3, 4, 5].map((clipNumber) => ({
        clipNumber,
        position: "start" as const,
        status: "completed" as const,
        blobUrl: `s${clipNumber}`,
      })),
    } as Partial<PublicVideo>),
    3,
  );
  assert.deepEqual(urls, ["s1", "s2", "s3"]);
});
