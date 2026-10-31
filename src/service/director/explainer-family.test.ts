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

test("paper-cutout board stays a full-bleed square-on background (no tilted board on a wall)", () => {
  for (const smoothMotion of [true, false]) {
    const block = cartoonExplainerDirectorBlock({ hasCharacter: true, canvas: "paper-cutout", smoothMotion });
    assert.match(block, /Paper-cutout camera & light lock/);
    assert.match(block, /square-on/);
    assert.match(block, /never a three-quarter, side, oblique/);
    assert.match(block, /never side-light/);
    assert.doesNotMatch(block, /from the character's left side, from above/);
    assert.doesNotMatch(block, /360 orbit|dutch snap|overhead drop/);
  }

  const frame = cartoonNarratorFrameLock(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG, {
    hasCharacter: true,
    clipNumber: 3,
    steadyStills: true,
    realistic: true,
  });
  assert.match(frame, /The wooden board IS the background/);
  assert.match(frame, /never show the board's edges/);
  assert.match(frame, /never a shadow cast by the board itself/);

  const director = DIRECTORS_BY_SLUG["paper-cutout-explainer-video-director"];
  assert.match(director.systemPrompt, /Flat camera & light lock \(every clip/);

  // Whiteboard keeps its per-clip angle rotation.
  const whiteboard = cartoonExplainerDirectorBlock({ hasCharacter: true, canvas: "whiteboard" });
  assert.match(whiteboard, /Camera angle changes every clip/);
  assert.doesNotMatch(whiteboard, /Paper-cutout camera & light lock/);
});

test("explainer hook title sits slightly above center on a bordered plate, not pinned to the top", () => {
  for (const slug of ["paper-cutout-explainer-video-director", "cartoon-explainer-video-director"] as const) {
    const canvas = explainerCanvasKind(slug) ?? "whiteboard";
    const block = cartoonExplainerDirectorBlock({ hasCharacter: true, canvas });
    assert.match(block, /slightly above the vertical center/);
    assert.match(block, /thick solid border/);
    assert.doesNotMatch(block, /spanning the upper-center/);

    const still = cartoonNarratorFrameLock(slug, { hasCharacter: true, clipNumber: 1, position: "start" });
    assert.match(still, /slightly above the vertical center/);
    assert.match(still, /thick solid border/);
    assert.doesNotMatch(still, /centered at the top/);

    const later = cartoonNarratorFrameLock(slug, { hasCharacter: true, clipNumber: 2, position: "start" });
    assert.doesNotMatch(later, /thick solid border/);

    const director = DIRECTORS_BY_SLUG[slug];
    assert.doesNotMatch(director.systemPrompt, /centered at the top of the explanation/);
  }
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
