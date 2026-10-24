import assert from "node:assert/strict";
import { test } from "node:test";
import { listWardrobeCatalogOptions } from "@/service/mcp/wardrobe-catalog";
import { decodeImageBase64 } from "@/service/mcp/image-input";

test("listWardrobeCatalogOptions returns every wardrobe part by default", () => {
  const rows = listWardrobeCatalogOptions();
  const parts = new Set(rows.map((row) => row.part));
  assert.ok(parts.has("hair"));
  assert.ok(parts.has("top"));
  assert.ok(parts.has("pants"));
  assert.ok(parts.has("shoes"));
  assert.ok(parts.has("accessory"));
  assert.ok(rows.length > 50);
  for (const row of rows) {
    assert.ok(row.id);
    assert.ok(row.prompt);
    assert.ok(row.description);
    assert.ok(Array.isArray(row.tags) && row.tags.length > 0);
    assert.ok(["classic", "stylized", "extreme"].includes(row.category));
  }
});

test("listWardrobeCatalogOptions filters by part and category", () => {
  const hair = listWardrobeCatalogOptions({ part: "hair" });
  assert.ok(hair.length > 0);
  assert.ok(hair.every((row) => row.part === "hair"));

  const classicHair = listWardrobeCatalogOptions({ part: "hair", category: "classic" });
  assert.ok(classicHair.length > 0);
  assert.ok(classicHair.every((row) => row.category === "classic"));
  assert.ok(classicHair.length < hair.length);
});

test("listWardrobeCatalogOptions filters by tags", () => {
  const pickle = listWardrobeCatalogOptions({ tags: ["pickleball"] });
  assert.ok(pickle.length > 0);
  assert.ok(pickle.every((row) => row.tags.includes("pickleball")));
});

test("decodeImageBase64 accepts data URLs and raw base64", () => {
  // 1x1 PNG
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const fromRaw = decodeImageBase64(pngBase64, "image/png");
  assert.equal(fromRaw.ext, "png");
  assert.ok(fromRaw.buffer.length > 0);

  const fromDataUrl = decodeImageBase64(`data:image/png;base64,${pngBase64}`);
  assert.equal(fromDataUrl.type, "image/png");
  assert.equal(fromDataUrl.buffer.length, fromRaw.buffer.length);
});
