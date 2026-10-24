import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeSearchQuery,
  searchLooks,
  searchStyles,
  searchWardrobeCatalog,
} from "@/service/mcp/look-search";
import type { PublicStyle } from "@/presentation/serialize";

test("normalizeSearchQuery splits English and Chinese separators", () => {
  assert.deepEqual(normalizeSearchQuery("  bob, 皮衣 / tennis "), ["bob", "皮衣", "tennis"]);
});

test("searchWardrobeCatalog finds hair by English label", () => {
  const hits = searchWardrobeCatalog({ query: "bob", part: "hair", limit: 10 });
  assert.ok(hits.some((hit) => hit.id === "bob"));
  assert.ok(hits.every((hit) => hit.part === "hair"));
});

test("searchWardrobeCatalog finds cloth by prompt keywords", () => {
  const hits = searchWardrobeCatalog({ query: "hoodie", part: "top", limit: 10 });
  assert.ok(hits.some((hit) => hit.id === "hoodie"));
});

test("searchWardrobeCatalog finds pickleball Peek-A-Boo looks by tag and text", () => {
  const byTag = searchWardrobeCatalog({
    query: "skort",
    part: "pants",
    tags: ["pickleball"],
    limit: 10,
  });
  assert.ok(byTag.some((hit) => hit.id === "sppeekabooskort"));
  assert.ok(byTag.every((hit) => hit.tags?.includes("pickleball")));

  const byText = searchWardrobeCatalog({ query: "peek-a-boo", part: "top", limit: 10 });
  assert.ok(byText.some((hit) => hit.id === "sppeekaboodress"));
  assert.ok(byText[0]?.description);
});

test("searchLooks can mix catalog hits and styles", () => {
  const styles: PublicStyle[] = [
    {
      id: "chalkboard",
      name: "Chalkboard",
      description: "White chalk on slate",
      canvasColor: "#111",
      isCustom: false,
    },
    {
      id: "clay",
      name: "Clay",
      description: "Soft clay render",
      canvasColor: "#eee",
      isCustom: false,
    },
  ];
  const hits = searchLooks({
    query: "chalk",
    includeStyles: true,
    styles,
    customItems: [],
    limit: 10,
  });
  assert.ok(hits.some((hit) => hit.kind === "style" && hit.id === "chalkboard"));
});

test("searchStyles ranks name matches", () => {
  const styles: PublicStyle[] = [
    {
      id: "realistic",
      name: "Realistic",
      description: "Photoreal people",
      canvasColor: "#000",
      isCustom: false,
    },
  ];
  const hits = searchStyles(styles, { query: "photo" });
  assert.equal(hits[0]?.id, "realistic");
});
