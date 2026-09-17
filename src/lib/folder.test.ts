import assert from "node:assert/strict";
import { test } from "node:test";
import {
  folderNameFromVideo,
  folderRollupStatus,
  looksLikeLegacyVideo,
} from "./folder";

test("legacy video has skillSlug and no name", () => {
  assert.equal(looksLikeLegacyVideo({ skillSlug: "cartoon-explainer-video-director" }), true);
  assert.equal(looksLikeLegacyVideo({ name: "Campaign", skillSlug: "x" }), false);
  assert.equal(looksLikeLegacyVideo({ name: "Campaign" }), false);
});

test("folder name prefers localized title and caps at 80 chars", () => {
  assert.equal(
    folderNameFromVideo({ phaseA: { localizedTitle: "複利", englishTitle: "Compound" } }),
    "複利",
  );
  assert.equal(folderNameFromVideo({}), "未命名專案");
  assert.equal(folderNameFromVideo({ phaseA: { localizedTitle: "x".repeat(90) } }).length, 80);
});

test("rollup prefers failed, then busy, then action, then all ready, else draft", () => {
  assert.equal(folderRollupStatus([]), "draft");
  assert.equal(folderRollupStatus(["ready", "failed"]), "failed");
  assert.equal(folderRollupStatus(["ready", "generating"]), "generating");
  assert.equal(folderRollupStatus(["ready", "awaiting_approval"]), "awaiting_approval");
  assert.equal(folderRollupStatus(["ready", "ready"]), "ready");
});
