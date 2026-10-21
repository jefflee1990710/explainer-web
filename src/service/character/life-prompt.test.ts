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

test("lifeShotPrompt enforces the 12 de-plastic realism rules for /app/life image generation", () => {
  const prompt = lifeShotPrompt({
    name: "Scro",
    kind: "street",
    place: "Central, Hong Kong",
    interests: ["photography"],
  });

  // Rule 01: 35mm film optics and no AI quality buzzwords
  assert.match(prompt, /Kodak Gold 200 or Ektachrome/);
  assert.match(prompt, /never 8K, ultra-realistic, hyperrealistic, masterpiece/);

  // Rule 11: grazing directional light + 1.4:1-1.8:1 cheek contrast + negative fill + matte-natural skin pores
  assert.match(prompt, /1\.4:1 to 1\.8:1 cheek-to-cheek contrast ratio/);
  assert.match(prompt, /25–40% natural shadow falloff, negative fill on the far cheek/);
  assert.match(prompt, /override any flat front lighting from the first identity reference image/);
  assert.match(prompt, /visible pores, fine peach-fuzz/);
  assert.match(prompt, /zero oily, waxy, or plastic specular sheen/);

  // Rule 06, 07, 10: unclipped highlights, lifted shadow blacks for 35mm grain, neutral/cool highlights by default
  assert.match(prompt, /below pure-white clipping with subtle halation/);
  assert.match(prompt, /subtle 35mm film grain with slightly lifted shadow blacks/);
  assert.match(prompt, /keep highlights neutral or cool by default/);
  assert.ok(prompt.includes(LIFE_REALISTIC_RENDER_RULE));
});

test("lifeReferenceOrder skips missing images and keeps identity first", () => {
  assert.deepEqual(lifeReferenceOrder({ hasScene: true, hasAnnotatedImage: true, hasCompositionRef: true }), {
    scene: 2,
    annotated: 3,
    composition: 4,
  });
  assert.deepEqual(lifeReferenceOrder({ hasScene: false, hasAnnotatedImage: true, hasCompositionRef: true }), {
    scene: 0,
    annotated: 0,
    composition: 2,
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
