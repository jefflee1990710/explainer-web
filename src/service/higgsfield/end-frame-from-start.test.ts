import assert from "node:assert/strict";
import { test } from "node:test";
import { PAPER_CUTOUT_EXPLAINER_SKILL_SLUG } from "@/service/director/explainer-family";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import {
  END_FRAME_PROMPT_MAX,
  diagramEndFrameUsesStartMotion,
  endFrameFromStartSystem,
  endFrameFromStartUserText,
  fitEndFramePrompt,
  writeEndFramePromptFromStart,
} from "@/service/higgsfield/end-frame-from-start";

const motion =
  "0.0–1.2s：標題「知識變現密碼」穩定。5.5–8.0s：所有元件穩定鎖定，Scro 維持指向「解決方法」。";

test("diagram end stills with a start image use the two-step prompt", () => {
  assert.equal(
    diagramEndFrameUsesStartMotion({
      skillSlug: PAPER_CUTOUT_EXPLAINER_SKILL_SLUG,
      position: "end",
      startImageUrl: "https://blob/start.jpg",
    }),
    true,
  );
  assert.equal(
    diagramEndFrameUsesStartMotion({
      skillSlug: CARTOON_EXPLAINER_SKILL_SLUG,
      position: "end",
      startImageUrl: "https://blob/start.jpg",
    }),
    true,
  );
  assert.equal(
    diagramEndFrameUsesStartMotion({
      skillSlug: PAPER_CUTOUT_EXPLAINER_SKILL_SLUG,
      position: "start",
      startImageUrl: "https://blob/start.jpg",
    }),
    false,
  );
  assert.equal(
    diagramEndFrameUsesStartMotion({
      skillSlug: "talking-head-director",
      position: "end",
      startImageUrl: "https://blob/start.jpg",
    }),
    false,
  );
  assert.equal(
    diagramEndFrameUsesStartMotion({
      skillSlug: PAPER_CUTOUT_EXPLAINER_SKILL_SLUG,
      position: "end",
      startImageUrl: "https://blob/start.jpg",
      promptEdited: true,
    }),
    false,
  );
  assert.equal(
    diagramEndFrameUsesStartMotion({
      skillSlug: PAPER_CUTOUT_EXPLAINER_SKILL_SLUG,
      position: "end",
      startImageUrl: "https://blob/start.jpg",
      hasRevision: true,
    }),
    false,
  );
});

test("the writer is told to stay inside the character cap and keep the landed state", () => {
  const system = endFrameFromStartSystem();
  assert.match(system, new RegExp(String(END_FRAME_PROMPT_MAX)));
  assert.match(system, /landed picture/);
  assert.match(system, /START still/);
  const user = endFrameFromStartUserText({
    motionCamera: motion,
    aspectRatio: "9:16",
    language: "zh-Hant",
  });
  assert.match(user, /知識變現密碼/);
  assert.match(user, /Traditional Chinese/);
  assert.match(user, /Aspect ratio 9:16/);
});

test("a fenced over-long prompt is clipped without cutting a Traditional label", () => {
  const body = `${"木".repeat(114)}「變現超能力」主持指向右下。`;
  const fitted = fitEndFramePrompt("```\n" + body + "\n```", 120);
  assert.ok(fitted.length <= 120);
  assert.equal(fitted.includes("「"), false);
  assert.equal(fitted.includes("變現"), false);
  assert.equal(fitted.startsWith("```"), false);
});

test("writeEndFramePromptFromStart sends the start image and motion, then returns the short prompt", async () => {
  const image = new Uint8Array([1, 2, 3]);
  let seenMotion = "";
  let seenImage: Uint8Array | undefined;
  const prompt = await writeEndFramePromptFromStart(
    {
      startImageUrl: "https://blob/start.jpg",
      motionCamera: motion,
      aspectRatio: "9:16",
      language: "zh-Hant",
    },
    {
      loadImage: async (url) => {
        assert.equal(url, "https://blob/start.jpg");
        return image;
      },
      generate: async (input) => {
        seenMotion = input.userText;
        seenImage = input.image;
        return "同一木板與正交鏡頭。標題原位改成「變現超能力」，冰山封條已撕開，Scro 指向「解決方法」。";
      },
    },
  );
  assert.equal(seenImage, image);
  assert.match(seenMotion, /motionCamera:/);
  assert.match(prompt, /變現超能力/);
  assert.ok(prompt.length <= END_FRAME_PROMPT_MAX);
});

test("an empty model reply is rejected so the caller can keep the built prompt", async () => {
  await assert.rejects(
    writeEndFramePromptFromStart(
      {
        startImageUrl: "https://blob/start.jpg",
        motionCamera: motion,
        aspectRatio: "9:16",
      },
      {
        loadImage: async () => new Uint8Array([1]),
        generate: async () => "   ",
      },
    ),
    /終點圖提示詞太短/,
  );
});
