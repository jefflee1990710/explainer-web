import assert from "node:assert/strict";
import { test } from "node:test";
import { LIFE_REALISTIC_RENDER_RULE, lifeShotPrompt } from "@/service/character/life-prompt";

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
