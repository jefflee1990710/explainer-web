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

test("lifeShotPrompt asks for a bright phone snapshot like a real Instagram post", () => {
  const prompt = lifeShotPrompt({
    name: "Scro",
    kind: "street",
    place: "Central, Hong Kong",
    interests: ["photography"],
  });

  // iPhone main camera only: deep focus, no mirrorless bokeh or AI quality buzzwords.
  assert.match(prompt, /iPhone main camera/);
  assert.match(prompt, /background stays in focus/);
  assert.doesNotMatch(prompt, /ZV-E1|shallow depth of field|optical depth of field/);
  assert.match(prompt, /never 8K, ultra-realistic, hyperrealistic, masterpiece/);

  // Bright, even phone HDR exposure instead of dramatic side light.
  assert.match(prompt, /bright phone auto-exposure with HDR/);
  assert.match(prompt, /face evenly lit/);
  assert.doesNotMatch(prompt, /cheek-to-cheek contrast ratio|nose-bridge shadow/);

  // Clean phone-processed skin, not hyper-detailed pores; bright true-to-life colour.
  assert.match(prompt, /light phone noise reduction/);
  assert.doesNotMatch(prompt, /visible pores/);
  assert.match(prompt, /clean whites/);

  // Off-centre, slightly imperfect framing and a natural expression.
  assert.match(prompt, /not perfectly centred/);
  assert.match(prompt, /relaxed natural expression/);
  assert.ok(prompt.includes(LIFE_REALISTIC_RENDER_RULE));
});

test("the scene photo fixes the place and enforces natural human scale in the scene", () => {
  const prompt = lifeShotPrompt({ name: "Alice", kind: "selfie", interests: [] });
  assert.match(prompt, /Keep this exact place/);
  assert.match(prompt, /never move them to a different location/);
  assert.match(prompt, /Scale & perspective: size Alice to true human height/);
  assert.match(prompt, /parapet walls, railings, doorways, tables, tiles/);
  assert.doesNotMatch(prompt, /lived-in real place|one or two props/);
});

test("the outfit preset image locks the clothes and hair exactly", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "selfie",
    interests: [],
    hasOutfitRef: true,
    outfitText: "white blouse, navy pleated skirt, loafers",
    hairText: "long straight dark brown hair, center part",
  });
  assert.match(prompt, /The second reference image is Alice's outfit preset/);
  assert.match(prompt, /Copy the hairstyle exactly from the outfit preset image/);
  assert.doesNotMatch(prompt, /keep that exact face, hair/);
  assert.match(prompt, /exactly this outfit — same garments, colours, fit, shoes and accessories/);
  assert.match(prompt, /Hair: long straight dark brown hair, center part/);
  assert.match(prompt, /Outfit: white blouse, navy pleated skirt, loafers\./);
  assert.match(prompt, /The third reference image is the base scene/);
  assert.doesNotMatch(prompt, /everyday outfit that suits the place/);
});

test("without a separate outfit image the identity blueprint carries the outfit", () => {
  const prompt = lifeShotPrompt({ name: "Alice", kind: "selfie", interests: [] });
  assert.match(prompt, /exactly the outfit shown in the identity blueprint/);
});

test("an explicit outfit instruction can still change the clothes", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "selfie",
    interests: [],
    hasOutfitRef: true,
    customInstruction: "Wear the outfit from this image.",
  });
  assert.match(prompt, /unless the edit instruction below asks for a different outfit/);
});

test("the selected pose overrides pose words in the post type", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "street",
    interests: [],
    templateGuide: "Lean on wall with one knee bent.",
    poseText: "Seated, chin on hand.",
  });
  assert.match(prompt, /The skeleton pose wins over any pose described in the post type/);
});

test("lifeReferenceOrder skips missing images and keeps identity first", () => {
  assert.deepEqual(lifeReferenceOrder({ hasScene: true, hasAnnotatedImage: true, hasCompositionRef: true }), {
    outfit: 0,
    scene: 2,
    annotated: 3,
    composition: 4,
    pose: 0,
  });
  assert.deepEqual(lifeReferenceOrder({ hasScene: false, hasAnnotatedImage: true, hasCompositionRef: true }), {
    outfit: 0,
    scene: 0,
    annotated: 0,
    composition: 2,
    pose: 0,
  });
  assert.deepEqual(
    lifeReferenceOrder({ hasOutfitRef: true, hasScene: true, hasAnnotatedImage: false, hasCompositionRef: false, hasPose: true }),
    { outfit: 2, scene: 3, annotated: 0, composition: 0, pose: 4 },
  );
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
    { outfit: 0, scene: 2, annotated: 0, composition: 3, pose: 4 },
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

test("a full-body pose replaces the selfie framing with a head-to-feet frame", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "selfie",
    interests: [],
    hasScene: true,
    poseText: "Standing with the right hand on the hip.",
    poseFraming: "full",
  });
  assert.match(prompt, /whole body from head to feet/);
  assert.match(prompt, /sized to match the scene's architecture/);
  assert.match(prompt, /Do NOT copy the skeleton's size on the canvas/);
  assert.doesNotMatch(prompt, /selfie at arm's length/);
});

test("pose prop tags become words in the pose sentence", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "food",
    interests: [],
    hasScene: false,
    poseText: "Sitting upright with the right hand near the chest.",
    poseHands: ["drink", "face"],
  });
  assert.match(prompt, /near the chest\. The raised hand holds a cup or glass\./);
});

test("a post type keeps its own framing even with a pose", () => {
  const prompt = lifeShotPrompt({
    name: "Alice",
    kind: "selfie",
    interests: [],
    hasScene: false,
    templateGuide: "Mirror selfie.",
    poseText: "Standing.",
    poseFraming: "full",
  });
  assert.match(prompt, /Post type: Mirror selfie\./);
  assert.doesNotMatch(prompt, /head to feet/);
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
