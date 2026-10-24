import assert from "node:assert/strict";
import test from "node:test";
import { catalogShowcaseStats } from "@/service/character/catalog-stats";

test("catalogShowcaseStats counts wardrobe, poses, and post templates", () => {
  const stats = catalogShowcaseStats();
  assert.ok(stats.wardrobeTotal > 100);
  assert.ok(stats.poses > 20);
  assert.ok(stats.postTemplates > 20);
  assert.ok(stats.parts.every((row) => row.count > 0));
  assert.ok(stats.tagExamples.includes("pickleball") || stats.tagExamples.includes("athletic"));
});
