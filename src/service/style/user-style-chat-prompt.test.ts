import assert from "node:assert/strict";
import { test } from "node:test";
import { USER_STYLE_VISUAL_KEYS } from "@/service/style/user-style-fields";
import { testStyle } from "@/service/style/test-styles";
import { copyUserStyleFields } from "@/service/style/user-style-fields";
import {
  userStyleChatSystemPrompt,
  userStyleChatUserPrompt,
} from "@/service/style/user-style-chat-prompt";

test("system prompt lists visual keys and forbids editing name or description", () => {
  const system = userStyleChatSystemPrompt();
  for (const key of USER_STYLE_VISUAL_KEYS) {
    assert.match(system, new RegExp(key));
  }
  assert.match(system, /name/i);
  assert.match(system, /description/i);
  assert.match(system, /must not|do not|never/i);
  assert.match(system, /summary/);
  assert.match(system, /edits/);
});

test("user prompt includes current look and the latest user message", () => {
  const fields = copyUserStyleFields(testStyle("doodle", { look: "marker strokes on paper" }));
  const prompt = userStyleChatUserPrompt({
    fields,
    history: [{ role: "user", content: "older ask", createdAt: new Date() }],
    message: "Make the look feel more torn",
  });
  assert.match(prompt, /marker strokes on paper/);
  assert.match(prompt, /Make the look feel more torn/);
});

test("user prompt notes an attached reference image", () => {
  const fields = copyUserStyleFields(testStyle("doodle"));
  const prompt = userStyleChatUserPrompt({
    fields,
    history: [
      {
        role: "user",
        content: "older ask",
        imageUrl: "https://example.com/ref.png",
        createdAt: new Date(),
      },
    ],
    message: "Match the attached reference image.",
    hasImage: true,
  });
  assert.match(prompt, /image attached/);
  assert.match(prompt, /reference image is attached/i);
});
