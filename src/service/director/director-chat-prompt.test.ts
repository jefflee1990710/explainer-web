import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_SUMMARY_MAX,
  directorChatSystemPrompt,
  directorChatUserPrompt,
  normalizeChatSummary,
} from "@/service/director/director-chat-prompt";
import { emptyProfile } from "@/service/director/profile";

test("system prompt describes profile editing and hides the template", () => {
  const system = directorChatSystemPrompt();
  assert.match(system, /profile/i);
  assert.match(system, /extraInstructions/);
  assert.match(system, /no access/i);
  assert.match(system, /summary/);
  assert.equal(system.includes("SKILL.md"), false);
});

test("user prompt lists fields in order, then history, then the request", () => {
  const prompt = directorChatUserPrompt({
    draft: { customProfile: { ...emptyProfile(), bestFor: "launches", rules: "calm" }, extraInstructions: "logo last" },
    history: [
      { role: "user", content: "shorter hooks", createdAt: new Date() },
      { role: "assistant", content: "Shortened hooks", changedPaths: ["hook"], createdAt: new Date() },
    ],
    message: "Add a rule about pacing",
  });
  const best = prompt.indexOf("### FIELD: bestFor (Best for)");
  const rules = prompt.indexOf("### FIELD: rules (Key rules)");
  const extra = prompt.indexOf("### FIELD: extraInstructions (Extra instructions)");
  const history = prompt.indexOf("shorter hooks");
  const request = prompt.indexOf("Add a rule about pacing");
  assert.ok(best >= 0 && rules > best && extra > rules);
  assert.ok(history > extra && request > history);
  assert.match(prompt, /launches/);
  assert.match(prompt, /\(changed: hook\)/);
  assert.match(prompt, /### FIELD: hook \(Opening hook\)\n\(empty\)/);
});

test("user prompt notes empty history", () => {
  const prompt = directorChatUserPrompt({
    draft: { customProfile: emptyProfile(), extraInstructions: "" },
    history: [],
    message: "hi",
  });
  assert.match(prompt, /Recent conversation:\n\(none\)/);
});

test("summary is trimmed and capped", () => {
  assert.equal(CHAT_SUMMARY_MAX, 500);
  assert.equal(normalizeChatSummary("  Shortened hooks \n", 1), "Shortened hooks");
  assert.equal(normalizeChatSummary(` ${"a".repeat(800)} `, 1), "a".repeat(500));
});

test("empty summary falls back to the changed field count", () => {
  assert.equal(normalizeChatSummary("   ", 3), "已更新 3 個欄位");
});
