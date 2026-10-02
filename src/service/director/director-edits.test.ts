import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DRAFT_FIELDS,
  applyDirectorEdits,
  changedDraftFields,
  draftFieldValue,
  parseDraft,
  type DirectorDraft,
} from "@/service/director/director-edits";
import { emptyProfile } from "@/service/director/profile";

function baseDraft(): DirectorDraft {
  return { customProfile: { ...emptyProfile(), hook: "question", rules: "calm" }, extraInstructions: "logo last" };
}

test("DRAFT_FIELDS lists the profile keys then extraInstructions", () => {
  assert.deepEqual(DRAFT_FIELDS, ["bestFor", "structure", "hook", "arc", "narrator", "visual", "audio", "rules", "extraInstructions"]);
});

test("applyDirectorEdits replaces a profile field without mutating the input", () => {
  const draft = baseDraft();
  const result = applyDirectorEdits(draft, [{ field: "hook", content: "bold claim" }]);
  assert.ok(result.ok);
  assert.equal(result.draft.customProfile.hook, "bold claim");
  assert.equal(result.draft.customProfile.rules, "calm");
  assert.deepEqual(result.changedFields, ["hook"]);
  assert.equal(draft.customProfile.hook, "question");
});

test("applyDirectorEdits replaces extra instructions", () => {
  const result = applyDirectorEdits(baseDraft(), [{ field: "extraInstructions", content: "no music" }]);
  assert.ok(result.ok);
  assert.equal(result.draft.extraInstructions, "no music");
  assert.deepEqual(result.changedFields, ["extraInstructions"]);
});

test("applyDirectorEdits rejects unknown fields atomically", () => {
  const result = applyDirectorEdits(baseDraft(), [
    { field: "hook", content: "x" },
    { field: "SKILL.md", content: "y" },
  ]);
  assert.deepEqual(result, { ok: false, error: "AI 修改了不存在的欄位" });
});

test("applyDirectorEdits enforces field limits", () => {
  assert.deepEqual(applyDirectorEdits(baseDraft(), [{ field: "arc", content: "a".repeat(601) }]), {
    ok: false,
    error: "欄位內容過長",
  });
  assert.ok(applyDirectorEdits(baseDraft(), [{ field: "arc", content: "a".repeat(600) }]).ok);
  assert.ok(applyDirectorEdits(baseDraft(), [{ field: "extraInstructions", content: "a".repeat(4000) }]).ok);
  assert.equal(applyDirectorEdits(baseDraft(), [{ field: "extraInstructions", content: "a".repeat(4001) }]).ok, false);
});

test("applyDirectorEdits drops no-op edits and keeps the last repeat", () => {
  const result = applyDirectorEdits(baseDraft(), [
    { field: "hook", content: "question" },
    { field: "rules", content: "first" },
    { field: "rules", content: "second" },
  ]);
  assert.ok(result.ok);
  assert.equal(result.draft.customProfile.rules, "second");
  assert.deepEqual(result.changedFields, ["rules"]);
});

test("changedDraftFields and draftFieldValue", () => {
  const saved = baseDraft();
  const draft = { customProfile: { ...saved.customProfile, visual: "neon" }, extraInstructions: "" };
  assert.deepEqual(changedDraftFields(saved, draft), ["visual", "extraInstructions"]);
  assert.deepEqual(changedDraftFields(saved, baseDraft()), []);
  assert.equal(draftFieldValue(draft, "visual"), "neon");
  assert.equal(draftFieldValue(draft, "extraInstructions"), "");
});

test("parseDraft coerces input and enforces limits", () => {
  const ok = parseDraft({ customProfile: { hook: "h", junk: "j" }, extraInstructions: 5 });
  assert.ok(ok.ok);
  assert.equal(ok.draft.customProfile.hook, "h");
  assert.equal(ok.draft.customProfile.bestFor, "");
  assert.equal(ok.draft.extraInstructions, "5");
  assert.equal("junk" in ok.draft.customProfile, false);
  assert.deepEqual(parseDraft({ customProfile: {}, extraInstructions: "a".repeat(4001) }), {
    ok: false,
    error: "欄位內容過長",
  });
  assert.ok(parseDraft(null).ok);
});
