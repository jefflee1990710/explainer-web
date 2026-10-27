import assert from "node:assert/strict";
import test from "node:test";
import { buildProductBlueprintPrompt } from "@/service/product/blueprint-prompt";

test("product sheet is photographed with grazing light, a 50mm lens, and clean digital colour", () => {
  const prompt = buildProductBlueprintPrompt({
    name: "Scro mug",
    description: "matte black ceramic",
    referenceCount: 2,
  });
  assert.match(prompt, /Photorealistic product reference sheet/);
  assert.match(prompt, /grazing directional key light/);
  assert.match(prompt, /50mm lens/);
  assert.match(prompt, /front view at f\/8/);
  assert.match(prompt, /no film grain/);
  assert.doesNotMatch(prompt, /Portra-style|subtle film grain/);
  assert.match(prompt, /Do not airbrush, beautify, illustrate, or restyle/);
  assert.match(prompt, /Scro mug/);
  assert.match(prompt, /matte black ceramic/);
  assert.match(prompt, /Fuse every attached photo/);
  assert.doesNotMatch(prompt, /evenly lit, no cast shadow/);
});
