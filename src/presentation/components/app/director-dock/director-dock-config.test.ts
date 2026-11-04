import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCastSlotItems,
  cycleOption,
  getDirectorHeroCopy,
} from "./director-dock-config";

test("getDirectorHeroCopy returns 3 showcase cards and localized headline for all 5 studios", () => {
  const kinds = ["explainer", "talking-head", "life", "scroswap", "teleport"] as const;
  for (const kind of kinds) {
    const copy = getDirectorHeroCopy(kind, "zh-Hant");
    assert.equal(copy.cards.length, 3);
    assert.ok(copy.headline.length > 0);
    assert.ok(copy.cards.every((c) => c.imageUrl.startsWith("/")));
  }
});

test("cycleOption wraps forward and backward safely", () => {
  const items = ["auto", "15s", "30s", "60s"] as const;
  assert.equal(cycleOption(items, "auto", 1), "15s");
  assert.equal(cycleOption(items, "auto", -1), "60s");
  assert.equal(cycleOption(items, "60s", 1), "auto");
});

test("buildCastSlotItems pads empty slots up to slotCount", () => {
  const chars = [
    { id: "c1", name: "Ada", previewUrl: "/a.png" },
    { id: "c2", name: "Ben", previewUrl: "/b.png" },
  ];
  const slots = buildCastSlotItems(["c2"], chars, 3);
  assert.equal(slots.length, 3);
  assert.equal(slots[0]?.character?.id, "c2");
  assert.equal(slots[1]?.character, null);
  assert.equal(slots[2]?.character, null);
});
