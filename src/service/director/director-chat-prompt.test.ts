import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_SUMMARY_MAX,
  directorChatSystemPrompt,
  directorChatUserPrompt,
  normalizeChatSummary,
} from "@/service/director/director-chat-prompt";

test("system prompt explains phase routing and edit rules", () => {
  const system = directorChatSystemPrompt();
  assert.match(system, /prompt-contract\.md/);
  assert.match(system, /Phase B/);
  assert.match(system, /examples\.md/);
  assert.match(system, /summary/);
});

test("user prompt lists files, then history, then the request", () => {
  const prompt = directorChatUserPrompt({
    draft: {
      systemPrompt: "# Skill body",
      references: [{ path: "references/hooks.md", content: "hook rules" }],
    },
    history: [
      { role: "user", content: "shorter hooks", createdAt: new Date() },
      { role: "assistant", content: "Shortened hooks", changedPaths: ["references/hooks.md"], createdAt: new Date() },
    ],
    message: "Add a rule about pacing",
  });
  const skillAt = prompt.indexOf("### FILE: SKILL.md");
  const refAt = prompt.indexOf("### FILE: references/hooks.md");
  const historyAt = prompt.indexOf("shorter hooks");
  const requestAt = prompt.indexOf("Add a rule about pacing");
  assert.ok(skillAt >= 0 && refAt > skillAt, "files listed SKILL.md first");
  assert.ok(historyAt > refAt, "history after files");
  assert.ok(requestAt > historyAt, "request last");
  assert.match(prompt, /# Skill body/);
  assert.match(prompt, /hook rules/);
});

test("user prompt notes empty history", () => {
  const prompt = directorChatUserPrompt({
    draft: { systemPrompt: "x", references: [] },
    history: [],
    message: "hi",
  });
  assert.match(prompt, /\(none\)/);
});

test("summary is trimmed", () => {
  assert.equal(normalizeChatSummary("  Shortened hooks \n", 1), "Shortened hooks");
});

test("summary is capped at 500 characters", () => {
  assert.equal(CHAT_SUMMARY_MAX, 500);
  const summary = normalizeChatSummary(` ${"a".repeat(800)} `, 1);
  assert.equal(summary, "a".repeat(500));
});

test("empty summary falls back to the changed file count", () => {
  assert.equal(normalizeChatSummary("   ", 3), "已更新 3 個檔案");
  assert.equal(normalizeChatSummary("", 1), "已更新 1 個檔案");
});
