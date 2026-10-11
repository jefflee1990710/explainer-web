import assert from "node:assert/strict";
import { test } from "node:test";
import {
  editorTabStorageKey,
  parseEditorTab,
  rememberedEditorStep,
} from "@/presentation/components/app/projects/new/editor-tab-memory";

test("editor tab memory is stored per video", () => {
  assert.equal(editorTabStorageKey("abc"), "explainer.editorTab:abc");
  assert.notEqual(editorTabStorageKey("abc"), editorTabStorageKey("def"));
});

test("only a saved 製作 or 影片 step is restored", () => {
  assert.equal(parseEditorTab(null), null);
  assert.equal(parseEditorTab(""), null);
  assert.equal(parseEditorTab("0"), null);
  assert.equal(parseEditorTab("3"), null);
  assert.equal(parseEditorTab("1"), 1);
  assert.equal(parseEditorTab("2"), 2);
});

test("影片 is restored only after every clip is ready", () => {
  assert.equal(rememberedEditorStep("1", false), 1);
  assert.equal(rememberedEditorStep("1", true), 1);
  assert.equal(rememberedEditorStep("2", false), null);
  assert.equal(rememberedEditorStep("2", true), 2);
  assert.equal(rememberedEditorStep(null, true), null);
});
