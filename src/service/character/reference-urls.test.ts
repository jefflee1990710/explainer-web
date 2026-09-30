import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_CHARACTER_REFERENCES,
  characterReferenceUrls,
  imageFilesFromList,
  parseReferenceImageUrls,
} from "@/service/character/reference-urls";

test("parseReferenceImageUrls keeps unique non-empty urls up to the cap", () => {
  const data = new FormData();
  data.append("referenceImageUrl", " https://blob/a.png ");
  data.append("referenceImageUrl", "");
  data.append("referenceImageUrl", "https://blob/a.png");
  data.append("referenceImageUrl", "https://blob/b.png");
  for (let i = 0; i < 8; i += 1) data.append("referenceImageUrl", `https://blob/${i}.png`);
  const urls = parseReferenceImageUrls(data);
  assert.equal(urls[0], "https://blob/a.png");
  assert.ok(urls.includes("https://blob/b.png"));
  assert.equal(urls.length, MAX_CHARACTER_REFERENCES);
  assert.equal(new Set(urls).size, urls.length);
});

test("characterReferenceUrls prefers the array and falls back to the single field", () => {
  assert.deepEqual(characterReferenceUrls({}), []);
  assert.deepEqual(characterReferenceUrls({ referenceImageUrl: "https://blob/one.png" }), [
    "https://blob/one.png",
  ]);
  assert.deepEqual(
    characterReferenceUrls({
      referenceImageUrl: "https://blob/old.png",
      referenceImageUrls: ["https://blob/a.png", "https://blob/b.png"],
    }),
    ["https://blob/a.png", "https://blob/b.png"],
  );
});

test("imageFilesFromList keeps only images and the remaining slots", () => {
  const png = new File(["x"], "a.png", { type: "image/png" });
  const jpg = new File(["x"], "b.jpg", { type: "image/jpeg" });
  const txt = new File(["x"], "c.txt", { type: "text/plain" });
  const extra = new File(["x"], "d.webp", { type: "image/webp" });
  assert.deepEqual(
    imageFilesFromList([txt, png, jpg, extra], 2).map((file) => file.name),
    ["a.png", "b.jpg"],
  );
});
