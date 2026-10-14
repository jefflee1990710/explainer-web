import assert from "node:assert/strict";
import { test } from "node:test";
import { librarySoundFromDoc, soundEffectPageBounds } from "@/service/sound-effect/library";

test("soundEffectPageBounds clamps the page and size", () => {
  assert.deepEqual(soundEffectPageBounds(0), { page: 1, pageSize: 24, skip: 0 });
  assert.deepEqual(soundEffectPageBounds(3, 24), { page: 3, pageSize: 24, skip: 48 });
  assert.equal(soundEffectPageBounds(2, 500).pageSize, 60);
});

test("librarySoundFromDoc keeps the blob url and drops incomplete rows", () => {
  const sound = librarySoundFromDoc({
    sourceId: "kenney/impact-sounds/impactGlass_heavy_001.ogg",
    name: "Glass smash 001",
    description: "Glass breaking",
    blobUrl: "https://blob.example/glass.ogg",
    durationSec: 0.43,
    tags: ["glass"],
    license: "CC0-1.0",
    credit: "Kenney (www.kenney.nl)",
  });
  assert.equal(sound?.id, "kenney/impact-sounds/impactGlass_heavy_001.ogg");
  assert.equal(sound?.previewUrl, "https://blob.example/glass.ogg");
  assert.equal(sound?.duration, 0.43);
  assert.equal(librarySoundFromDoc({ name: "missing url" }), null);
});
