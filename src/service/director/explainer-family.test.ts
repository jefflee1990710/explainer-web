import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cartoonExplainerDirectorBlock,
  cartoonNarratorFrameLock,
  cartoonNarratorVideoLock,
} from "@/service/director/skill-rules";
import {
  coerceDiagramExplainerOnScreenText,
  explainerCanvasKind,
  isDiagramExplainerSkill,
  PAPER_CUTOUT_EXPLAINER_SKILL_SLUG,
  PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG,
} from "@/service/director/explainer-family";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import { DIRECTORS_BY_SLUG } from "@/service/director/catalog";
import { videoLocksSystem } from "@/service/director/video-locks";
import { getDirectorRuleModule } from "@/service/director/rules";

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
  assert.match(director.systemPrompt, /Flat stationary camera & light lock \(every clip/);

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
    assert.match(block, /42–46% from the top/);
    assert.match(block, /thick solid border/);
    assert.doesNotMatch(block, /35–45%/);
    assert.doesNotMatch(block, /spanning the upper-center/);

    const still = cartoonNarratorFrameLock(slug, { hasCharacter: true, clipNumber: 1, position: "start" });
    assert.match(still, /slightly above the vertical center/);
    assert.match(still, /42–46% from the top/);
    assert.match(still, /thick solid border/);
    assert.doesNotMatch(still, /centered at the top/);

    const later = cartoonNarratorFrameLock(slug, { hasCharacter: true, clipNumber: 2, position: "start" });
    assert.doesNotMatch(later, /thick solid border/);

    const director = DIRECTORS_BY_SLUG[slug];
    assert.doesNotMatch(director.systemPrompt, /centered at the top of the explanation/);
  }

  const papercraft = cartoonExplainerDirectorBlock({ hasCharacter: true, canvas: "papercraft-diorama" });
  assert.match(papercraft, /vertical center, shifted slightly upward/);
  const papercraftStill = cartoonNarratorFrameLock(PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG, {
    hasCharacter: true,
    clipNumber: 1,
    position: "start",
  });
  assert.match(papercraftStill, /42–46% from the top/);
  assert.match(papercraftStill, /thick solid border/);
  assert.doesNotMatch(papercraftStill, /35–45%/);

  for (const slug of [
    "cartoon-explainer-video-director",
    "paper-cutout-explainer-video-director",
    "papercraft-diorama-director",
  ] as const) {
    const detail = getDirectorRuleModule(slug).phaseASceneDetailBlock({
      realistic: false,
      selfShot: false,
      hasCharacter: true,
    });
    assert.match(detail, /vertical center, shifted slightly upward/);
    assert.match(detail, /never pin it to the top edge/);
    assert.match(detail, /exactly ONE on-screen text/);
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
    assert.match(block, /Start-Still Diagram Transformation/);
    assert.match(block, /There is no last-frame image/);
    assert.match(block, /toward the written endScene/);
    assert.doesNotMatch(block, /first_frame/);
    assert.doesNotMatch(block, /last_frame/);
    assert.doesNotMatch(block, /uses dual keyframes/);
    assert.doesNotMatch(block, /interpolates cleanly between those two keyframes/);
    assert.match(block, /Visual Transformation Spine \(Cause-and-Effect Clarity\)/);
    assert.match(block, /On-canvas beat text \(EXPLAIN THE BEAT ON THE BOARD\)/);
    assert.match(block, /1-2-3 Visual Reading Path & Single Hero Pop/);
  }
  for (const slug of ["paper-cutout-explainer-video-director", "cartoon-explainer-video-director"] as const) {
    const director = DIRECTORS_BY_SLUG[slug];
    assert.match(director.systemPrompt, /Visual Transformation Spine \(Cause-and-Effect Clarity\)/);
    assert.match(director.systemPrompt, /Animated Elements Plus Concise/);
    assert.match(director.systemPrompt, /1-2-3 Visual Reading Path & Single Hero Pop/);
    assert.doesNotMatch(director.systemPrompt, /Start \+ End dual keyframes/);
  }
  const cartoon = DIRECTORS_BY_SLUG["cartoon-explainer-video-director"];
  assert.match(cartoon.systemPrompt, /There is no last-frame image/);
  assert.match(cartoon.systemPrompt, /written endScene/);
  const storyboard = cartoon.references.find((ref) => ref.path.endsWith("storyboard-template.md"));
  assert.ok(storyboard);
  assert.match(storyboard.content, /start still plus this motion text/);
  assert.match(storyboard.content, /written landing/);
  assert.doesNotMatch(storyboard.content, /only gets those two frames/);
  assert.ok(cartoon.profile);
  assert.match(cartoon.profile.hook, /Start \+ End dual keyframes/);

  const cutout = DIRECTORS_BY_SLUG["paper-cutout-explainer-video-director"];
  assert.match(cutout.systemPrompt, /There is no end still/);
  assert.match(cutout.systemPrompt, /written endScene/);
  assert.ok(cutout.profile);
  assert.match(cutout.profile.hook, /Start \+ End dual keyframes/);
});

test("paper-cutout director defines preset backgrounds on IDirector and resolves surface locks", () => {
  const director = DIRECTORS_BY_SLUG["paper-cutout-explainer-video-director"];
  assert.equal(director.behavior.allowsRoomBackgroundUpload, true);
  assert.equal(director.defaultBackgroundId, "wood-cardboard");
  assert.ok(Array.isArray(director.presetBackgrounds));
  const ids = director.presetBackgrounds.map((bg) => bg.id);
  assert.deepEqual(ids, [
    "wood-cardboard",
    "paper",
    "blueprint-paper",
    "concrete",
    "office-table",
    "sky",
  ]);
  for (const bg of director.presetBackgrounds) {
    assert.match(bg.previewUrl, /^\/director-backgrounds\/paper-cutout\/.+\.webp$/);
    assert.ok(bg.nameEn.length > 0);
    assert.ok(bg.nameZhHant.length > 0);
    assert.ok(bg.surfacePrompt.length > 0);
  }

  // Blueprint paper preset replaces wood craft board in director block, frame lock, and video lock
  const blueprintBlock = cartoonExplainerDirectorBlock({
    hasCharacter: true,
    canvas: "paper-cutout",
    backgroundId: "blueprint-paper",
  });
  assert.match(blueprintBlock, /blueprint/i);
  assert.doesNotMatch(blueprintBlock, /dark warm-brown vertically-grained wooden craft board/);

  const concreteFrame = cartoonNarratorFrameLock(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG, {
    hasCharacter: true,
    clipNumber: 1,
    backgroundId: "concrete",
  });
  assert.match(concreteFrame, /concrete/i);
  assert.doesNotMatch(concreteFrame, /wooden board IS the background/);

  const skyVideo = cartoonNarratorVideoLock(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG, {
    hasCharacter: true,
    clipNumber: 2,
    backgroundId: "sky",
  });
  assert.match(skyVideo, /sky/i);

  // Uploaded custom background image overrides preset surface
  const customFrame = cartoonNarratorFrameLock(PAPER_CUTOUT_EXPLAINER_SKILL_SLUG, {
    hasCharacter: true,
    clipNumber: 1,
    customBackground: true,
  });
  assert.match(customFrame, /attached background reference image/i);
});

test("diagram explainers cannot choose none and always paint every clip", () => {
  assert.equal(coerceDiagramExplainerOnScreenText({ skillSlug: "story-short-director" }), null);
  const coerced = coerceDiagramExplainerOnScreenText({
    skillSlug: CARTOON_EXPLAINER_SKILL_SLUG,
    language: "en",
    sceneTextLanguage: "none",
    onScreenTextStyleId: "not-a-look",
  });
  assert.deepEqual(coerced, {
    sceneTextLanguage: "en",
    sceneTextEnabled: true,
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "all",
  });
  assert.equal(
    coerceDiagramExplainerOnScreenText({
      skillSlug: PAPER_CUTOUT_EXPLAINER_SKILL_SLUG,
      language: "yue",
      sceneTextLanguage: "zh-Hans",
      onScreenTextStyleId: "neon",
    })?.onScreenTextStyleId,
    "neon",
  );
});

test("papercraft-diorama-director belongs to the diagram explainer family with 3D diorama rules (not 2D whiteboard)", () => {
  const director = DIRECTORS_BY_SLUG[PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG];
  assert.equal(director.behavior.dualBeat, true);
  assert.equal(director.behavior.speechMode, "narrator");
  assert.equal(director.behavior.allowsInWorldLabels, true);
  assert.equal(director.behavior.keyframeMode, "start-only");
  assert.equal(isDiagramExplainerSkill(PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG), true);
  assert.equal(explainerCanvasKind(PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG), "papercraft-diorama");
  assert.equal(director.defaultBackgroundId, "cobalt");
  assert.deepEqual(
    director.presetBackgrounds?.map((bg) => bg.id),
    ["cobalt", "cream", "mustard", "terracotta", "teal", "kraft"],
  );
  assert.ok(director.presetBackgrounds?.every((bg) => Boolean(bg.swatch)));

  const coerced = coerceDiagramExplainerOnScreenText({
    skillSlug: PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG,
    language: "zh-Hant",
    sceneTextLanguage: "none",
    onScreenTextStyleId: "clean",
  });
  assert.deepEqual(coerced, {
    sceneTextLanguage: "zh-Hant",
    sceneTextEnabled: true,
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "all",
  });

  const verticalBlock = cartoonExplainerDirectorBlock({
    hasCharacter: false,
    canvas: "papercraft-diorama",
    aspectRatio: "9:16",
  });
  assert.match(verticalBlock, /3D PAPERCRAFT DIORAMA EXPLAINER/);
  assert.match(verticalBlock, /PORTRAIT 9:16 COMPOSITION/);
  assert.match(verticalBlock, /top-to-bottom/i);
  assert.doesNotMatch(verticalBlock, /Whole-canvas 2D whiteboard lock/);
  assert.doesNotMatch(verticalBlock, /BACKGROUND COLOR LOCK/);

  const mustard = cartoonExplainerDirectorBlock({
    hasCharacter: false,
    canvas: "papercraft-diorama",
    backgroundId: "mustard",
  });
  assert.match(mustard, /warm mustard yellow 300gsm matte cardstock sheet/);

  const frame = cartoonNarratorFrameLock(PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG, {
    hasCharacter: false,
    clipNumber: 2,
    position: "start",
  });
  assert.match(frame, /3D Papercraft Diorama lock/);
  assert.match(frame, /NO dark\/navy top-and-bottom padding bands/);
  assert.doesNotMatch(frame, /BACKGROUND COLOR LOCK/);

  const creamFrame = cartoonNarratorFrameLock(PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG, {
    hasCharacter: false,
    clipNumber: 2,
    position: "end",
    backgroundId: "cream",
  });
  assert.match(creamFrame, /warm cream ivory 300gsm matte cardstock sheet/);

  const tealVideo = cartoonNarratorVideoLock(PAPERCRAFT_DIORAMA_EXPLAINER_SKILL_SLUG, {
    hasCharacter: false,
    backgroundId: "teal",
  });
  assert.match(tealVideo, /deep teal 300gsm matte cardstock sheet/);
});

