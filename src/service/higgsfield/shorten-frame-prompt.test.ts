import assert from "node:assert/strict";
import { test } from "node:test";
import { IMAGE_PROMPT_MAX_CHARS } from "@/service/higgsfield/frame-prompts";
import {
  ensureFramePromptFits,
  framePromptNeedsShorten,
  validateShortenedFramePrompt,
} from "@/service/higgsfield/shorten-frame-prompt";

const original = [
  "Lettering: hand-drawn.",
  'Marker (spell exactly): "Cut the paper"',
  "Scene: a paper figure pushes a card.",
  "COMPOSITION LOCK: attached image 2 is THIS CLIP'S START frame.",
  "Keep the same world, set, and lighting. Camera angle MAY change.",
  "Aspect ratio 9:16.",
].join("\n");

test("a prompt under the cap is sent unchanged", async () => {
  let called = false;
  const prompt = "Scene: short.\nAspect ratio 16:9.";
  assert.equal(framePromptNeedsShorten(prompt), false);
  const sent = await ensureFramePromptFits(prompt, async () => {
    called = true;
    return "nope";
  });
  assert.equal(sent, prompt);
  assert.equal(called, false);
});

test("a prompt at the cap is shortened and must keep quotes and labels", async () => {
  const long = `${original}\n${"pad ".repeat(IMAGE_PROMPT_MAX_CHARS)}`;
  assert.equal(framePromptNeedsShorten(long), true);
  const shortened = [
    "Lettering: hand-drawn.",
    'Marker (spell exactly): "Cut the paper"',
    "Scene: figure pushes a card.",
    "COMPOSITION LOCK: attached image 2 is THIS CLIP'S START frame.",
    "Aspect ratio 9:16.",
  ].join("\n");
  const sent = await ensureFramePromptFits(long, async () => shortened);
  assert.equal(sent, shortened);
  assert.ok(sent.length < IMAGE_PROMPT_MAX_CHARS);
});

test("a shortened prompt that drops a quoted line is rejected", () => {
  const check = validateShortenedFramePrompt(original, original.replace('"Cut the paper"', '"cut paper"'));
  assert.equal(check.ok, false);
});

test("a shortened prompt that drops a section label is rejected", () => {
  const check = validateShortenedFramePrompt(
    original,
    original.replace("COMPOSITION LOCK:", "Lock:"),
  );
  assert.equal(check.ok, false);
});

test("a shortened prompt that is still at the cap is rejected", () => {
  const stillLong = `${original}\n${"x".repeat(IMAGE_PROMPT_MAX_CHARS)}`;
  const check = validateShortenedFramePrompt(original, stillLong);
  assert.equal(check.ok, false);
});

test("ensureFramePromptFits does not return an invalid shortening", async () => {
  const long = `${original}\n${"pad ".repeat(IMAGE_PROMPT_MAX_CHARS)}`;
  await assert.rejects(
    () => ensureFramePromptFits(long, async () => "Scene: only this."),
    /遺失了必須原樣保留的文字|遺失了段落結構/,
  );
});
