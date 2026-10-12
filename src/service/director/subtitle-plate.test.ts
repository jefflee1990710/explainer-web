import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PLATE_EMPTY_ERROR,
  isMagentaKeyPixel,
  opaqueRatio,
  plateIsEmpty,
  subtitlePlatePrompt,
  usesTalkingHeadSubtitleOverlay,
} from "@/service/director/subtitle-plate";

test("overlay gate is both talking-head skills on cinematic realistic only", () => {
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "realistic" }), true);
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "full-body-talking-head-director", styleId: "realistic" }),
    true,
  );
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "abc", baseStyleId: "realistic" }),
    true,
  );
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "doodle" }), false);
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "cartoon-explainer-video-director", styleId: "realistic" }), false);
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "doodle", baseStyleId: "doodle" }),
    false,
  );
});

test("plate prompt spells the line on magenta and keeps the look", () => {
  const prompt = subtitlePlatePrompt({ line: "Hello there.", lookLine: "Look: thick marker." });
  assert.match(prompt, /Hello there\./);
  assert.match(prompt, /#FF00FF/);
  assert.match(prompt, /thick marker/);
  assert.match(prompt, /No person/);
  const yue = subtitlePlatePrompt({ line: "唔該晒", language: "yue", sampleImageIndex: 1 });
  assert.doesNotMatch(yue, /唔該晒/);
  assert.match(yue, /attached image 1/);
});

test("magenta key drops the backdrop and keeps dark letters", () => {
  assert.equal(isMagentaKeyPixel(255, 0, 255), true);
  assert.equal(isMagentaKeyPixel(220, 30, 230), true);
  assert.equal(isMagentaKeyPixel(10, 10, 10), false);
  assert.equal(opaqueRatio([{ r: 255, g: 0, b: 255 }, { r: 0, g: 0, b: 0 }]), 0.5);
  assert.equal(plateIsEmpty(0.009), true);
  assert.equal(plateIsEmpty(0.01), false);
  assert.equal(PLATE_EMPTY_ERROR, "字幕圖沒有留下可疊上的字");
});
