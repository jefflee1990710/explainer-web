import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cartoonExplainerDirectorBlock,
  cartoonNarratorFrameLock,
  cartoonNarratorVideoLock,
} from "@/service/director/skill-rules";
import {
  explainerCanvasKind,
  isDiagramExplainerSkill,
  PAPER_CUTOUT_EXPLAINER_SKILL_SLUG,
} from "@/service/director/explainer-family";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import { DIRECTORS_BY_SLUG } from "@/service/director/catalog";
import { videoLocksSystem } from "@/service/director/video-locks";

test("paper-cutout explainer is a dual-beat diagram sibling of whiteboard", () => {
  const director = DIRECTORS_BY_SLUG["paper-cutout-explainer-video-director"];
  assert.equal(director.behavior.dualBeat, true);
  assert.equal(director.behavior.speechMode, "narrator");
  assert.equal(director.behavior.allowsInWorldLabels, true);
  assert.equal(director.behavior.maxBackgroundSets, 1);
  assert.equal(director.behavior.keyframeMode, "start-only");
  assert.equal(isDiagramExplainerSkill(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG), true);
  assert.equal(explainerCanvasKind(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG), "paper-cutout");
  assert.equal(explainerCanvasKind(CARTOON_EXPLAINER_SKILL_SLUG), "whiteboard");
});

test("paper-cutout director block and frame/video locks use collage language", () => {
  const block = cartoonExplainerDirectorBlock({
    hasCharacter: true,
    canvas: "paper-cutout",
  });
  assert.match(block, /Paper-cutout collage lock|white scissor border/i);
  assert.match(block, /paper-cutout explanation collage/i);
  assert.doesNotMatch(block, /Whole-canvas 2D whiteboard lock/);

  const frame = cartoonNarratorFrameLock(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG, {
    hasCharacter: true,
    clipNumber: 1,
  });
  assert.match(frame, /white scissor border|Paper-cutout collage/i);
  assert.match(frame, /Silent demonstrator/);

  const video = cartoonNarratorVideoLock(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG, {
    hasCharacter: true,
    clipNumber: 2,
  });
  assert.match(video, /off-screen narrator/);
  assert.match(video, /white scissor border|paper-cutout craft collage/i);
});

test("video locks force paper-cutout-canvas for the paper-cutout director", () => {
  const system = videoLocksSystem("en", PAPER_CUTOUT_EXPLAINER_SKILL_SLUG);
  assert.match(system, /paper-cutout-canvas/);
  assert.match(system, /craft board/i);
  assert.doesNotMatch(system, /setId is whiteboard-canvas/);
});
