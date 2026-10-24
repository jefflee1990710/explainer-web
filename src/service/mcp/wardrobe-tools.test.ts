import assert from "node:assert/strict";
import { test } from "node:test";
import { listWardrobeCatalogOptions } from "@/service/mcp/wardrobe-tools";

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
