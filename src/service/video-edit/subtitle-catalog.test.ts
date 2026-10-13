import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSubtitleCatalog } from "@/service/video-edit/subtitle-catalog";

const ui = {
  subtitles: "Subtitles",
  hint: "hint",
  generate: "Generate",
  generating: "Generating",
  placed: "Placed {count}",
  placedPartial: "Placed {count} missing {missing}",
  noLines: "none",
  noMatch: "nomatch",
};

test("catalog keeps each spoken line and the selected look", () => {
  const catalog = buildSubtitleCatalog({
    clips: [
      { clipNumber: 2, englishVo: "  Second line  " },
      { clipNumber: 1, englishVo: "", startVo: "First" },
      { clipNumber: 3, englishVo: "   " },
    ],
    subtitleLook: "neon",
    textStyles: [{ id: "abc", name: "Mine", imageUrl: "https://blob.example/x.png", baseLookId: "gold" }],
    origin: "http://localhost:3000",
    label: (look) => look,
    ui,
  });
  assert.deepEqual(catalog.lines, [
    { clipNumber: 1, line: "First" },
    { clipNumber: 2, line: "Second line" },
  ]);
  assert.equal(catalog.selectedId, "neon");
  const neon = catalog.styles.find((style) => style.id === "neon");
  assert.equal(neon?.previewUrl, "http://localhost:3000/text-styles/neon-6de201104f.png");
  assert.equal(neon?.drawLook, "neon");
  const custom = catalog.styles.find((style) => style.id === "abc");
  assert.equal(custom?.drawLook, "gold");
  assert.equal(custom?.previewUrl, "https://blob.example/x.png");
});

test("a saved text style stays selected, and an unknown base look draws as marker", () => {
  const catalog = buildSubtitleCatalog({
    clips: [],
    subtitleLook: "handwritten",
    textStyleId: "abc",
    textStyles: [{ id: "abc", name: "Mine", imageUrl: "https://blob.example/x.png", baseLookId: "nope" }],
    origin: "http://localhost:3000",
    label: (look) => look,
    ui,
  });
  assert.equal(catalog.selectedId, "abc");
  assert.equal(catalog.styles.find((style) => style.id === "abc")?.drawLook, "handwritten");
});
