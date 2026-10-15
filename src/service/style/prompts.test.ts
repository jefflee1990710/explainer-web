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

test("visual style block is picture only and drops on-screen text clauses", () => {
  const block = styleBlockForDirector({
    ...doodle,
    id: "realistic",
    name: "Cinematic realistic",
    look: "photoreal still. No on-canvas text.",
    negatives: "illustration, captions, subtitles, floating UI text",
  });
  assert.match(block, /## Visual style: Cinematic realistic/);
  assert.match(block, /how the picture is drawn/);
  assert.match(block, /photoreal still/);
  assert.match(block, /illustration/);
  assert.match(block, /Motion: marker-doodle animation/);
  assert.doesNotMatch(block, /on-canvas|captions|subtitles|UI text|24mm|text style|lettering/i);
  assert.doesNotMatch(styleBlockForDirector(doodle), /24mm f\/1\.2/);
});

test("director block carries motion and negatives, not typography", () => {
  const block = styleBlockForDirector(doodle);
  assert.match(block, /## Visual style/);
  assert.doesNotMatch(block, /Typography:/);
  assert.doesNotMatch(block, /all-caps marker labels/);
  assert.match(block, /Motion:/);
  assert.match(block, /Never:/);
  assert.doesNotMatch(block, HEX);
});

test("frame lines name the style, canvas and look, and omit lettering", () => {
  const lines = styleLinesForFrame({
    ...doodle,
    negatives: "photorealism, printed fonts",
  });
  assert.match(lines.join("\n"), /Whiteboard doodle short video/);
  assert.match(lines.join("\n"), /Canvas: clean solid white canvas/);
  assert.match(lines.join("\n"), /photorealism/);
  assert.doesNotMatch(lines.join("\n"), /fonts|Lettering|marker labels/i);
  assert.match(styleLetteringLine(doodle), /^Lettering: .*all-caps marker labels/);
  assert.doesNotMatch(lines.join("\n"), HEX);
});

test("blueprint lines carry the canvas so a chalkboard sheet is not white", () => {
  const chalk = styleLinesForBlueprint(chalkboard).join("\n");
  assert.match(chalk, /dark green slate chalkboard/);
  assert.doesNotMatch(chalk, /solid white/);
});
