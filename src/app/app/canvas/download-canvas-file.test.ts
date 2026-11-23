import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasDownloadFilename } from "@/app/app/canvas/download-canvas-file";

describe("canvasDownloadFilename", () => {
  it("joins the project name and the node name, then uses the output extension", () => {
    assert.equal(
      canvasDownloadFilename(
        "聖誕燈飾",
        "FFmpeg 合併串接",
        "https://blob.example/outputs/concat-final.mp4?download=1",
        "video",
      ),
      "聖誕燈飾 - FFmpeg 合併串接.mp4",
    );
  });

  it("keeps an extension already present on the node name", () => {
    assert.equal(
      canvasDownloadFilename("Promo", "clip.webm", "https://blob.example/raw", "video"),
      "Promo - clip.webm",
    );
  });

  it("falls back to the output kind when the url has no extension", () => {
    assert.equal(
      canvasDownloadFilename("   ", "   ", "https://blob.example/file", "audio"),
      "canvas-output.mp3",
    );
    assert.equal(
      canvasDownloadFilename(undefined, undefined, "https://blob.example/file", "image"),
      "canvas-output.png",
    );
  });
});
