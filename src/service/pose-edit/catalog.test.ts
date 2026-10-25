import assert from "node:assert/strict";
import test from "node:test";
import { listOutfitCatalog, listPoseCatalog } from "@/service/pose-edit/catalog";

test("listPoseCatalog returns absolute preview urls and a Traditional Chinese label", () => {
  const rows = listPoseCatalog("https://www.scro.io");
  const pose = rows.find((row) => row.id === "standing-arms-relaxed");
  assert.ok(pose);
  assert.equal(pose?.previewUrl.startsWith("https://www.scro.io/life-pose-previews/"), true);
  assert.equal(pose?.skeletonUrl, "https://www.scro.io/life-poses/standing-arms-relaxed.png");
  assert.equal(typeof pose?.label, "string");
  assert.equal(rows.some((row) => "promptText" in row), false);
});

test("listOutfitCatalog is tops, pants, shoes, and accessories with pictures", () => {
  const rows = listOutfitCatalog("https://www.scro.io");
  assert.equal(rows.length > 0, true);
  assert.equal(rows.every((row) => ["top", "pants", "shoes", "accessory"].includes(row.part)), true);
  assert.equal(rows.some((row) => row.id === "none"), false);
  assert.equal(rows.every((row) => row.previewUrl.startsWith("https://www.scro.io/character-looks/")), true);
  const jeans = rows.find((row) => row.id === "jeans");
  assert.equal(jeans?.label, "jeans");
});
