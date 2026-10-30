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
  assert.match(block, /wooden craft board/i);
  assert.match(block, /never a gridded cutting mat, never floor tiles/i);
  assert.match(block, /paper-cutout explanation collage/i);
  assert.match(block, /at least four distinct cutout pieces/i);
  assert.match(block, /Scene prompt/);
  assert.match(block, /Camera motion prompt/);
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
  assert.match(frame, /every teaching element named in the Scene/i);
  assert.match(video, /every teaching element named in the Scene/i);
  assert.match(video, /white scissor border|paper-cutout craft collage/i);
});

test("video locks force paper-cutout-canvas for the paper-cutout director", () => {
  const system = videoLocksSystem("en", PAPER_CUTOUT_EXPLAINER_SKILL_SLUG);
  assert.match(system, /paper-cutout-canvas/);
  assert.match(system, /craft board/i);
  assert.doesNotMatch(system, /setId is whiteboard-canvas/);
});

test("both diagram explainers enforce 6 diagram archetypes, 70/30 hierarchy, complete start scaffold, and steady stills", () => {
  for (const canvas of ["whiteboard", "paper-cutout"] as const) {
    const block = cartoonExplainerDirectorBlock({ hasCharacter: true, canvas });
    assert.match(block, /Structured Diagram Archetype \(REQUIRED\)/);
    assert.match(block, /Split Matrix \/ Before-vs-After/);
    assert.match(block, /Causal Chain \/ Pipeline/);
    assert.match(block, /Funnel \/ Filter/);
    assert.match(block, /Balance Scale \/ Trade-off Seesaw/);
    assert.match(block, /Iceberg \/ Layered Stack/);
    assert.match(block, /Quantitative Chart \/ Annotated Curve/);
    assert.match(block, /70\/30 Diagram-First Spatial Hierarchy/);
    assert.match(block, /Complete Diagram Scaffold in `startScene`/);
  }
});
