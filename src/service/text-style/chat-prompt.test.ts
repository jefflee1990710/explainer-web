import assert from "node:assert/strict";
import test from "node:test";
import {
  textStyleChatSystemPrompt,
  textStyleChatUserPrompt,
} from "@/service/text-style/chat-prompt";

test("text style chat system prompt only allows lookLine", () => {
  const system = textStyleChatSystemPrompt();
  assert.match(system, /lookLine/);
  assert.match(system, /never placement/i);
});

test("text style chat user prompt includes history and current look", () => {
  const prompt = textStyleChatUserPrompt({
    lookLine: "Look: neon cyan tubing.",
    history: [
      {
        role: "user",
        content: "make it pink",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    message: "thicker strokes",
    hasImage: true,
  });
  assert.match(prompt, /Look: neon cyan tubing/);
  assert.match(prompt, /make it pink/);
  assert.match(prompt, /thicker strokes/);
  assert.match(prompt, /reference image is attached/);
});
