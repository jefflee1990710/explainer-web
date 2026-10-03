import assert from "node:assert/strict";
import { test } from "node:test";
import {
  committedFolderName,
  folderNameFromVideo,
  folderRollupStatus,
  looksLikeLegacyVideo,
} from "@/service/folder";

test("legacy video has skillSlug and no name", () => {
  assert.equal(looksLikeLegacyVideo({ skillSlug: "cartoon-explainer-video-director" }), true);
  assert.equal(looksLikeLegacyVideo({ name: "Campaign", skillSlug: "x" }), false);
  assert.equal(looksLikeLegacyVideo({ name: "Campaign" }), false);
});

test("committed folder name skips blank or unchanged drafts", () => {
  assert.equal(committedFolderName("Launch", "Launch"), null);
  assert.equal(committedFolderName("Launch", "  "), null);
  assert.equal(committedFolderName("Launch", "  Q4 launch  "), "Q4 launch");
  assert.equal(committedFolderName("Launch", `${"x".repeat(90)}`)?.length, 80);
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
  assert.equal(folderRollupStatus(["ready", "production"]), "production");
  assert.equal(folderRollupStatus(["ready", "awaiting_approval"]), "awaiting_approval");
  assert.equal(folderRollupStatus(["ready", "ready"]), "ready");
});
