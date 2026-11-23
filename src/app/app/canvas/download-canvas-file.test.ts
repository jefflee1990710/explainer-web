import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasDownloadFilename } from "@/app/app/canvas/download-canvas-file";

describe("canvasDownloadFilename", () => {
  it("uses the node title and the file extension from the output url", () => {
    assert.equal(
      canvasDownloadFilename(
        "FFmpeg 合併串接",
        "https://blob.example/outputs/concat-final.mp4?download=1",
        "video",
      ),
      "FFmpeg 合併串接.mp4",
    );
  });

  it("keeps an extension already present on the title", () => {
    assert.equal(
      canvasDownloadFilename("clip.webm", "https://blob.example/raw", "video"),
      "clip.webm",
    );
  });

  it("falls back to the output kind when the url has no extension", () => {
    assert.equal(
      canvasDownloadFilename("   ", "https://blob.example/file", "audio"),
      "canvas-output.mp3",
    );
    assert.equal(
      canvasDownloadFilename(undefined, "https://blob.example/file", "image"),
      "canvas-output.png",
    );
  });
});
