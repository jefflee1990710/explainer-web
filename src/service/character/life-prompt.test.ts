import assert from "node:assert/strict";
import { test } from "node:test";
import { LIFE_REALISTIC_RENDER_RULE, lifeReferenceOrder, lifeShotPrompt } from "@/service/character/life-prompt";

test("lifeShotPrompt includes numbered color remarks and forbids rendering annotation marks in output", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "selfie",
    place: "Hong Kong",
    interests: ["coffee"],
    customInstruction: "Replace the person in the photo with Alice.",
    hasAnnotatedImage: true,
    remarks: [
      { number: 1, colorName: "red (#ff3b30)", comment: "Replace this person with Alice" },
      { number: 2, colorName: "blue (#007aff)", comment: "Add a latte on the table here" },
    ],
  });

  assert.match(prompt, /Replace the person in the photo with Alice/);
  assert.match(prompt, /#1 \(red \(#ff3b30\)\): Replace this person with Alice/);
  assert.match(prompt, /#2 \(blue \(#007aff\)\): Add a latte on the table here/);
  assert.match(prompt, /NEVER reproduce, draw, or leave any colored annotation strokes, circles, arrows, or #1\/#2\/#3 numbers/i);
});

test("lifeShotPrompt enforces real human camera capture rules (without heavy 35mm film filter) for /app/life image generation", () => {
  const prompt = lifeShotPrompt({
    name: "Scro",
    kind: "street",
    place: "Central, Hong Kong",
    interests: ["photography"],
  });

  // Real human modern camera equipment (iPhone 16 Pro / Sony ZV-E1) and no AI quality buzzwords or heavy vintage film filter
  assert.match(prompt, /iPhone 16 Pro 24mm f\/1\.8 main camera, Sony ZV-E1/);
  assert.match(prompt, /never heavy vintage 35mm film filter, never 8K, ultra-realistic, hyperrealistic, masterpiece/);
  assert.match(prompt, /no heavy 35mm film grain or retro Kodak LUT/);

  // Clean 1.2:1-1.5:1 natural facial contrast + matte-natural skin pores
  assert.match(prompt, /1\.2:1 to 1\.5:1 cheek-to-cheek contrast ratio/);
  assert.match(prompt, /override any flat front lighting from the first identity reference image/);
  assert.match(prompt, /visible pores, fine peach-fuzz/);
  assert.match(prompt, /zero oily, waxy, or plastic specular sheen/);

  // Unclipped highlights, clean CMOS sensor micro-texture, neutral/cool highlights by default
  assert.match(prompt, /below pure-white clipping/);
  assert.match(prompt, /subtle natural ISO 100–400 digital sensor micro-texture/);
  assert.match(prompt, /keep highlights neutral or cool by default/);
  assert.ok(prompt.includes(LIFE_REALISTIC_RENDER_RULE));
});

test("lifeReferenceOrder skips missing images and keeps identity first", () => {
  assert.deepEqual(lifeReferenceOrder({ hasScene: true, hasAnnotatedImage: true, hasCompositionRef: true }), {
    scene: 2,
    annotated: 3,
    composition: 4,
    pose: 0,
  });
  assert.deepEqual(lifeReferenceOrder({ hasScene: false, hasAnnotatedImage: true, hasCompositionRef: true }), {
    scene: 0,
    annotated: 0,
    composition: 2,
    pose: 0,
  });
});

test("lifeShotPrompt without a template keeps the legacy scene wording", () => {
  const prompt = lifeShotPrompt({ name: "Alice", kind: "selfie", interests: [] });
  assert.match(prompt, /The second reference image is the base scene\/photograph \(lighting direction, environment, composition, and props\)/);
  assert.match(prompt, /If the second image contains a person/);
  assert.match(prompt, /phone selfie at arm's length/);
  assert.doesNotMatch(prompt, /composition reference ONLY/);
});

test("lifeShotPrompt with a template and composition reference names the right image", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "street",
    interests: ["coffee"],
    templateGuide: "Look-back pose: glance over the shoulder.",
    hasScene: true,
    hasCompositionRef: true,
  });
  assert.match(prompt, /Post type: Look-back pose/);
  assert.match(prompt, /The third reference image is a composition reference ONLY/);
  assert.match(prompt, /Do NOT copy that person's face, hair, outfit, or the background/);
  assert.doesNotMatch(prompt, /candid three-quarter street photo/);
});

test("lifeReferenceOrder puts the pose skeleton last", () => {
  assert.deepEqual(
    lifeReferenceOrder({ hasScene: true, hasAnnotatedImage: false, hasCompositionRef: true, hasPose: true }),
    { scene: 2, annotated: 0, composition: 3, pose: 4 },
  );
  assert.equal(lifeReferenceOrder({ hasScene: false, hasAnnotatedImage: false, hasCompositionRef: false, hasPose: true }).pose, 2);
});

test("lifeShotPrompt with a pose names the skeleton image and forbids drawing it", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "street",
    interests: [],
    hasScene: true,
    poseText: "Standing with the right hand on the hip.",
  });
  assert.match(prompt, /The third reference image is a stick-figure pose skeleton/);
  assert.match(prompt, /Put Alice in exactly this body pose: Standing with the right hand on the hip\./);
  assert.match(prompt, /never draw its lines, dots or circle/);
});

test("with a pose, the composition reference only drives the camera", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "street",
    interests: [],
    hasScene: true,
    hasCompositionRef: true,
    poseText: "Seated, chin on hand.",
  });
  assert.match(prompt, /The third reference image is a camera reference ONLY/);
  assert.match(prompt, /Do NOT copy that person's pose/);
  assert.match(prompt, /The fourth reference image is a stick-figure pose skeleton/);
  assert.doesNotMatch(prompt, /copy its pose, body angle/);
});

test("lifeShotPrompt with a template and no scene asks for an invented location", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "food",
    place: "Tokyo",
    interests: [],
    templateGuide: "Seated cafe portrait.",
    hasScene: false,
    hasCompositionRef: true,
  });
  assert.match(prompt, /No scene photo is given/);
  assert.match(prompt, /The second reference image is a composition reference ONLY/);
  assert.doesNotMatch(prompt, /base scene\/photograph/);
  assert.doesNotMatch(prompt, /If the .* image contains a person/);
});
