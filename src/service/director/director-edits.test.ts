import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIRECTOR_FILE_MAX,
  SKILL_PATH,
  applyDirectorEdits,
  changedDraftPaths,
  draftPaths,
  type DirectorDraft,
} from "@/service/director/director-edits";

// Draft with SKILL.md plus two reference files.
function baseDraft(): DirectorDraft {
  return {
    systemPrompt: "# Skill",
    references: [
      { path: "references/style.md", content: "style" },
      { path: "references/pace.md", content: "pace" },
    ],
  };
}

test("draftPaths lists SKILL.md first then references", () => {
  assert.deepEqual(draftPaths(baseDraft()), [SKILL_PATH, "references/style.md", "references/pace.md"]);
});

test("applyDirectorEdits replaces SKILL.md", () => {
  const draft = baseDraft();
  const result = applyDirectorEdits(draft, [{ path: SKILL_PATH, content: "# New" }]);
  assert.ok(result.ok);
  assert.equal(result.draft.systemPrompt, "# New");
  assert.deepEqual(result.changedPaths, [SKILL_PATH]);
  assert.equal(draft.systemPrompt, "# Skill");
});

test("applyDirectorEdits replaces one reference and leaves others identical", () => {
  const draft = baseDraft();
  const result = applyDirectorEdits(draft, [{ path: "references/pace.md", content: "faster" }]);
  assert.ok(result.ok);
  assert.deepEqual(result.draft.references, [
    { path: "references/style.md", content: "style" },
    { path: "references/pace.md", content: "faster" },
  ]);
  assert.equal(result.draft.systemPrompt, "# Skill");
  assert.deepEqual(result.changedPaths, ["references/pace.md"]);
  assert.equal(draft.references[1].content, "pace");
});

test("applyDirectorEdits rejects unknown paths", () => {
  const result = applyDirectorEdits(baseDraft(), [{ path: "references/missing.md", content: "x" }]);
  assert.deepEqual(result, { ok: false, error: "AI 修改了不存在的檔案" });
});

test("applyDirectorEdits rejects files over the size limit", () => {
  assert.equal(DIRECTOR_FILE_MAX, 60_000);
  const result = applyDirectorEdits(baseDraft(), [{ path: SKILL_PATH, content: "a".repeat(60_001) }]);
  assert.deepEqual(result, { ok: false, error: "檔案內容過長" });
});

test("applyDirectorEdits accepts content exactly at the size limit", () => {
  const result = applyDirectorEdits(baseDraft(), [{ path: SKILL_PATH, content: "a".repeat(60_000) }]);
  assert.ok(result.ok);
});

test("applyDirectorEdits omits identical content from changedPaths", () => {
  const result = applyDirectorEdits(baseDraft(), [
    { path: SKILL_PATH, content: "# Skill" },
    { path: "references/style.md", content: "new style" },
  ]);
  assert.ok(result.ok);
  assert.deepEqual(result.changedPaths, ["references/style.md"]);
});

test("applyDirectorEdits uses the last edit when a path repeats", () => {
  const result = applyDirectorEdits(baseDraft(), [
    { path: "references/style.md", content: "first" },
    { path: "references/style.md", content: "second" },
  ]);
  assert.ok(result.ok);
  assert.equal(result.draft.references[0].content, "second");
  assert.deepEqual(result.changedPaths, ["references/style.md"]);
});

test("changedDraftPaths lists only differing paths", () => {
  const saved = baseDraft();
  const draft: DirectorDraft = {
    systemPrompt: "# Edited",
    references: [
      { path: "references/style.md", content: "style" },
      { path: "references/pace.md", content: "slow" },
    ],
  };
  assert.deepEqual(changedDraftPaths(saved, draft), [SKILL_PATH, "references/pace.md"]);
  assert.deepEqual(changedDraftPaths(saved, baseDraft()), []);
});
