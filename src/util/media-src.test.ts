import assert from "node:assert/strict";
import { test } from "node:test";
import { displayMediaSrc, mediaSrc } from "@/util/media-src";

test("displayMediaSrc cache-busts a rewritten blob with the claim time", () => {
  const item = {
    blobUrl: "https://blob.example/frames/start.png",
    submittedAt: "2026-10-01T12:00:00.000Z",
  };
  assert.equal(mediaSrc(item), item.blobUrl);
  assert.equal(
    displayMediaSrc(item),
    `${item.blobUrl}?v=${encodeURIComponent(item.submittedAt)}`,
  );
});

test("displayMediaSrc leaves a URL alone when there is no claim time", () => {
  assert.equal(displayMediaSrc({ blobUrl: "https://blob.example/a.png" }), "https://blob.example/a.png");
  assert.equal(displayMediaSrc(null), undefined);
});
