import assert from "node:assert/strict";
import { test } from "node:test";
import { STYLES, STYLE_IDS, resolveStyle } from "@/service/style/catalog";
import {
  styleBlockForDirector,
  styleLetteringLine,
  styleLinesForBlueprint,
  styleLinesForFrame,
} from "@/service/style/prompts";

const HEX = /#[0-9a-f]{3,8}\b/i;

test("every style ships a director block with typography, motion and negatives", () => {
  for (const id of STYLE_IDS) {
    const block = styleBlockForDirector(STYLES[id]);
    assert.match(block, /## Visual style/);
    // The override is scoped to rendering rules; identity lock + everyman stay
    // unless a cast/blueprint is given.
    assert.match(block, /overrides the rendering, palette, lettering and motion rules/);
    assert.match(block, /default everyman applies only when no cast\/reference is given/);
    assert.match(block, /appearance follows the attached blueprint/);
    assert.match(block, /Typography:/);
    assert.match(block, /Motion:/);
    assert.match(block, /Never:/);
    assert.doesNotMatch(block, HEX, `${id} leaks a hex code`);
  }
});

test("frame lines name the style, canvas, look and lettering", () => {
  const lines = styleLinesForFrame(STYLES.doodle);
  assert.match(lines.join("\n"), /Whiteboard doodle short video/);
  assert.match(lines.join("\n"), /Canvas: clean solid white canvas/);
  assert.match(styleLetteringLine(STYLES.doodle), /^Lettering: .*all-caps marker labels/);
  assert.doesNotMatch(lines.join("\n"), HEX);
});

test("blueprint lines carry the canvas so a chalkboard sheet is not white", () => {
  const chalk = styleLinesForBlueprint(STYLES.chalkboard).join("\n");
  assert.match(chalk, /dark green slate chalkboard/);
  assert.doesNotMatch(chalk, /solid white/);
});

test("resolveStyle falls back to doodle", () => {
  assert.equal(resolveStyle(undefined).id, "doodle");
  assert.equal(resolveStyle("nope").id, "doodle");
  assert.equal(resolveStyle("pixel").id, "pixel");
});
