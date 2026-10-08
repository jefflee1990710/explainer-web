import assert from "node:assert/strict";
import { test } from "node:test";
import type { Style } from "@/service/style/types";
import {
  styleBlockForDirector,
  styleLetteringLine,
  styleLinesForBlueprint,
  styleLinesForFrame,
} from "@/service/style/prompts";

const HEX = /#[0-9a-f]{3,8}\b/i;

const doodle: Style = {
  id: "doodle",
  name: "Whiteboard doodle",
  description: "desc",
  canvas: "clean solid white canvas, as if sketched with a digital marker",
  canvasColor: "#ffffff",
  look: "2D hand-drawn cartoon",
  palette: "white canvas, black ink",
  typography: "short handwritten all-caps marker labels in black",
  motion: "marker-doodle animation",
  negatives: "photorealism, 3D rendering",
};

const chalkboard: Style = {
  ...doodle,
  id: "chalkboard",
  name: "Chalkboard",
  canvas: "dark green slate chalkboard with faint chalk-dust smudges",
};

test("cinematic realistic tells the director to pick a prime per clip", () => {
  const block = styleBlockForDirector({
    ...doodle,
    id: "realistic",
    name: "Cinematic realistic",
  });
  assert.match(block, /24mm f\/1\.2/);
  assert.match(block, /35mm f\/1\.4/);
  assert.match(block, /50mm f\/1\.4/);
  assert.match(block, /80mm f\/1\.4/);
  assert.match(block, /35mm f\/1\.4 to 80mm f\/1\.4/);
  assert.doesNotMatch(styleBlockForDirector(doodle), /24mm f\/1\.2/);
});

test("director block carries typography, motion and negatives", () => {
  const block = styleBlockForDirector(doodle);
  assert.match(block, /## Visual style/);
  assert.match(block, /overrides the rendering, palette, and motion rules/);
  assert.match(block, /default everyman applies only when no cast\/reference is given/);
  assert.match(block, /appearance follows the attached blueprint/);
  assert.match(block, /selected text style/);
  assert.doesNotMatch(block, /Typography:/);
  assert.match(block, /Motion:/);
  assert.match(block, /Never:/);
  assert.doesNotMatch(block, HEX);
});

test("frame lines name the style, canvas, look and lettering", () => {
  const lines = styleLinesForFrame(doodle);
  assert.match(lines.join("\n"), /Whiteboard doodle short video/);
  assert.match(lines.join("\n"), /Canvas: clean solid white canvas/);
  assert.match(styleLetteringLine(doodle), /^Lettering: .*all-caps marker labels/);
  assert.doesNotMatch(lines.join("\n"), HEX);
});

test("blueprint lines carry the canvas so a chalkboard sheet is not white", () => {
  const chalk = styleLinesForBlueprint(chalkboard).join("\n");
  assert.match(chalk, /dark green slate chalkboard/);
  assert.doesNotMatch(chalk, /solid white/);
});
