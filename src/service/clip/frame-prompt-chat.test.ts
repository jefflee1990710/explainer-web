import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyFramePromptEdit,
  emptyFramePromptSummary,
  ensureSightlinePrompt,
  framePromptEditSystem,
  framePromptSummarySystem,
  framePromptThread,
  FRAME_PROMPT_CHAT_MAX,
  openingSummaryFresh,
  promptForFrameSubmit,
  withFramePromptThread,
} from "@/service/clip/frame-prompt-chat";

test("still chat keeps the sightline rule when the camera changes", () => {
  assert.match(framePromptEditSystem(), /Sightline: show only what this camera can see/);
  assert.match(framePromptEditSystem(), /rewrite the Scene so it still obeys Sightline/);
  assert.match(framePromptEditSystem(), /Do not turn a person or a prop around/);
});

test("a scene that wants both sides is reconciled before it is sent", () => {
  const scene =
    "Scene: over-the-shoulder shot from behind, showing her back and the glowing computer screen in front of her.";
  const tail = Array.from({ length: 40 }, () => "Camera landing: extra motion note.").join("\n");
  const edited = ensureSightlinePrompt(`${scene}\n${tail}`, FRAME_PROMPT_CHAT_MAX);
  assert.match(edited, /Do not turn anyone or anything around/);
  assert.doesNotMatch(edited, /Monitor facing|glowing|in front of her/);
  assert.match(edited, /^Sightline:/m);
  assert.ok(edited.length <= FRAME_PROMPT_CHAT_MAX);

  const page = ensureSightlinePrompt("Scene: rear view of the open book, the page text clearly readable.");
  assert.match(page, /stays on the side that faces its user/);
  assert.doesNotMatch(page, /clearly readable/);

  const saved = applyFramePromptEdit("Scene: front view.", `${scene}\nLook: torn paper.`);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.changed, true);
  assert.match(saved.prompt, /Do not turn anyone or anything around/);

  const sent = promptForFrameSubmit({
    storedPrompt: scene,
    promptEdited: true,
    builtPrompt: "built",
  });
  assert.match(sent, /Do not turn anyone or anything around/);
  assert.match(sent, /^Sightline:/m);
});

test("a stored prompt is sent only after the still chat edits it", () => {
  assert.equal(
    promptForFrameSubmit({
      storedPrompt: "edited",
      promptEdited: true,
      builtPrompt: "built",
    }),
    "edited",
  );
  assert.equal(
    promptForFrameSubmit({
      storedPrompt: "old",
      useStoredPrompt: true,
      builtPrompt: "built",
    }),
    "old",
  );
  assert.equal(
    promptForFrameSubmit({
      storedPrompt: "old",
      builtPrompt: "built",
    }),
    "built",
  );
});

test("an edited prompt must be a full non-blank prompt", () => {
  const same = applyFramePromptEdit("Look: torn paper.", "Look: torn paper.");
  assert.equal(same.ok, true);
  if (!same.ok) return;
  assert.equal(same.changed, false);

  const next = applyFramePromptEdit("Look: torn paper.", "  Look: torn paper. Subtitle dead center.  ");
  assert.equal(next.ok, true);
  if (!next.ok) return;
  assert.equal(next.changed, true);
  assert.equal(next.prompt, "Look: torn paper. Subtitle dead center.");

  const blank = applyFramePromptEdit("Look: torn paper.", "   ");
  assert.equal(blank.ok, false);
});

test("frame threads ignore the old clip-wide chat", () => {
  const chats = [
    { clipNumber: 1, messages: [{ role: "assistant" as const, content: "old", createdAt: new Date() }] },
    {
      clipNumber: 1,
      position: "end" as const,
      messages: [{ role: "assistant" as const, content: "end", createdAt: new Date() }],
    },
  ];
  assert.equal(framePromptThread(chats, 1, "start"), undefined);
  assert.equal(framePromptThread(chats, 1, "end")?.messages[0]?.content, "end");
  const saved = withFramePromptThread(chats, {
    clipNumber: 1,
    position: "start",
    messages: [{ role: "assistant", content: "start", createdAt: new Date() }],
  });
  assert.equal(saved.filter((item) => item.clipNumber === 1 && item.position === "start").length, 1);
  assert.equal(saved.some((item) => !item.position), true);
});

test("an empty still gets a summary without calling the model", () => {
  assert.match(emptyFramePromptSummary("zh-Hant"), /還沒有提示/);
  assert.match(emptyFramePromptSummary("en"), /no prompt yet/);
});

test("the opening summary is a bullet list in the interface language", () => {
  const traditional = framePromptSummarySystem("zh-Hant");
  assert.match(traditional, /Traditional Chinese/);
  assert.match(traditional, /• /);
  assert.doesNotMatch(traditional, /Simplified Chinese/);
  const english = framePromptSummarySystem("en");
  assert.match(english, /English/);
  assert.match(framePromptSummarySystem("ja"), /Japanese/);

  const bullet = { role: "assistant", content: "• 一位女生\n• 站在天台", locale: "zh-Hant" };
  assert.equal(openingSummaryFresh([bullet], "zh-Hant"), true);
  assert.equal(openingSummaryFresh([bullet], "en"), false);
  assert.equal(
    openingSummaryFresh([{ role: "assistant", content: "A woman stands on a roof.", locale: "en" }], "en"),
    false,
  );
  assert.equal(
    openingSummaryFresh(
      [bullet, { role: "user", content: "放大字幕", locale: "zh-Hant" }],
      "en",
    ),
    true,
  );
});
