import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generationMediaKind,
  kindFromMediaUrl,
  mergeOutputItems,
  outputItem,
} from "@/service/output/items";

describe("output list items", () => {
  it("drops a row that has no file url", () => {
    assert.equal(
      outputItem({
        id: "a",
        kind: "image",
        title: "Still",
        url: "  ",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      null,
    );
  });

  it("keeps the newest copy when the same file appears twice", () => {
    const merged = mergeOutputItems(
      [
        outputItem({
          id: "old",
          kind: "image",
          title: "Old",
          url: "https://blob/same.png",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        outputItem({
          id: "new",
          kind: "image",
          title: "New",
          url: "https://blob/same.png",
          createdAt: "2026-02-01T00:00:00.000Z",
        }),
        outputItem({
          id: "audio",
          kind: "audio",
          title: "Voice",
          url: "https://blob/voice.mp3",
          createdAt: "2026-01-15T00:00:00.000Z",
        }),
      ],
      10,
    );
    assert.deepEqual(
      merged.map((item) => item.id),
      ["new", "audio"],
    );
  });

  it("stops at the requested length after sorting", () => {
    const merged = mergeOutputItems(
      [
        outputItem({
          id: "a",
          kind: "video",
          title: "A",
          url: "https://blob/a.mp4",
          createdAt: "2026-03-01T00:00:00.000Z",
        }),
        outputItem({
          id: "b",
          kind: "image",
          title: "B",
          url: "https://blob/b.png",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ],
      1,
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.id, "a");
  });

  it("maps a storyboard video job to video and a still to image", () => {
    assert.equal(generationMediaKind("video"), "video");
    assert.equal(generationMediaKind("still"), "image");
    assert.equal(generationMediaKind("frame"), "image");
  });

  it("reads image, video, and audio from the file extension", () => {
    assert.equal(kindFromMediaUrl("https://blob/a.MP4?v=1", "image"), "video");
    assert.equal(kindFromMediaUrl("https://blob/a.wav", "image"), "audio");
    assert.equal(kindFromMediaUrl("https://blob/a.webp", "video"), "image");
    assert.equal(kindFromMediaUrl("https://blob/no-ext", "audio"), "audio");
  });
});
