import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listSystemDefaultOutfits,
  systemOutfitAsset,
  systemOutfitMatches,
} from "@/service/canvas/core/system-outfits";

describe("system default outfits", () => {
  it("lists every built-in wardrobe piece except none", () => {
    const rows = listSystemDefaultOutfits();
    assert.ok(rows.length > 200);
    assert.equal(rows.some((row) => row.optionId === "none"), false);
    assert.ok(rows.some((row) => row.part === "top" && row.optionId === "hoodie"));
    assert.ok(rows.some((row) => row.part === "hair" && row.optionId === "bob"));
    assert.ok(rows.some((row) => row.optionId.startsWith("sg")));
    const hoodie = rows.find((row) => row.part === "top" && row.optionId === "hoodie");
    assert.ok(hoodie);
    assert.match(hoodie.previewUrl, /^\/character-looks\/top-hoodie\.webp/);
    const asset = systemOutfitAsset(hoodie, "連帽衫");
    assert.equal(asset.source, "outfit");
    assert.equal(asset.outfitPart, "top");
    assert.equal(asset.outfitPrompt, hoodie.prompt);
    assert.equal(asset.id, "system-outfit-top-hoodie");
  });

  it("filters by part and search text", () => {
    const rows = listSystemDefaultOutfits();
    const tops = rows.filter((row) => systemOutfitMatches(row, row.optionId, "", "top"));
    assert.ok(tops.length > 0);
    assert.ok(tops.every((row) => row.part === "top"));
    const hoodie = rows.filter((row) =>
      systemOutfitMatches(row, "連帽衫", "hoodie", "all"),
    );
    assert.ok(hoodie.some((row) => row.optionId === "hoodie"));
    const chinese = rows.filter((row) =>
      systemOutfitMatches(row, "連帽衫", "連帽", "top"),
    );
    assert.ok(chinese.some((row) => row.optionId === "hoodie"));
    assert.equal(
      rows.filter((row) => systemOutfitMatches(row, row.optionId, "zzzz-not-an-outfit", "all"))
        .length,
      0,
    );
  });
});
