import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PLATE_EMPTY_ERROR,
  isGreenKeyPixel,
  opaqueRatio,
  plateIsEmpty,
  subtitlePlatePrompt,
  usesTalkingHeadSubtitleOverlay,
} from "@/service/director/subtitle-plate";

test("talking-head realistic no longer uses a separate subtitle overlay", () => {
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "realistic" }), false);
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "full-body-talking-head-director", styleId: "realistic" }),
    false,
  );
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "abc", baseStyleId: "realistic" }),
    false,
  );
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "doodle" }), false);
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "cartoon-explainer-video-director", styleId: "realistic" }), false);
});

test("plate prompt spells the line on green and keeps the look", () => {
  const prompt = subtitlePlatePrompt({ line: "Hello there.", lookLine: "Look: thick marker." });
  assert.match(prompt, /Hello there\./);
  assert.match(prompt, /#00FF00/);
  assert.match(prompt, /thick marker/);
  assert.match(prompt, /No person/);
  const yue = subtitlePlatePrompt({ line: "唔該晒", language: "yue", sampleImageIndex: 1 });
  assert.doesNotMatch(yue, /唔該晒/);
  assert.match(yue, /attached image 1/);
});

test("green key drops the backdrop and keeps dark letters", () => {
  assert.equal(isGreenKeyPixel(0, 255, 0), true);
  assert.equal(isGreenKeyPixel(40, 230, 30), true);
  assert.equal(isGreenKeyPixel(10, 10, 10), false);
  assert.equal(isGreenKeyPixel(255, 255, 0), false);
  assert.equal(isGreenKeyPixel(255, 255, 255), false);
  assert.equal(opaqueRatio([{ r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 0 }]), 0.5);
  assert.equal(plateIsEmpty(0.009), true);
  assert.equal(plateIsEmpty(0.01), false);
  assert.equal(PLATE_EMPTY_ERROR, "字幕圖沒有留下可疊上的字");
});
