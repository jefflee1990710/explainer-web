import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";
import {
  buildBlueprintPrompt,
  buildFullBodyPrompt,
  buildPortraitPrompt,
  buildProfilePrompt,
} from "@/service/character/blueprint-prompt";
import { resetStyleOverlay, resolvedStyle } from "@/service/style/load-style";
import { renderableFromSystem } from "@/service/style/renderable-style";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";

before(() => installTestStyles());
after(() => uninstallTestStyles());

function loadedStyle(id: "doodle" | "chalkboard") {
  return renderableFromSystem(resolvedStyle(id));
}

test("blueprint prompt lays out turnaround, walk cycle, and expression grid", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "一個穿藍色格子睡衣的小男孩，頭上有三根呆毛",
    hasReference: false,
  });
  assert.match(prompt, /front, back, left, and right/i);
  assert.match(prompt, /walk cycle/i);
  assert.match(prompt, /3 by 4 grid of head-and-shoulders expressions/i);
  assert.match(prompt, /Background: doodle canvas/i);
  assert.match(prompt, /3:2 landscape canvas/i);
  assert.match(prompt, /Leave at least 12% blank margin/i);
  assert.match(prompt, /Nothing may touch, clip, or extend beyond the image border/i);
  assert.match(prompt, /Final check: every drawing must be fully visible/i);
  assert.match(prompt, /doodle look/i);
  assert.match(prompt, /小男孩/);
  assert.doesNotMatch(prompt, /reference image/i);
});

test("blueprint prompt locks 五官比例, 整體氣質, and source skin texture from one reference", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 1,
  });
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.match(prompt, /Skin texture: focus on and faithfully preserve the source image's exact skin texture/);
  assert.match(prompt, /Hair: copy the reference exactly/);
  assert.match(prompt, /Do not tie it back/);
  assert.match(prompt, /Style is required/);
  assert.match(prompt, /doodle name style/);
  assert.match(prompt, /must not replace the face proportions, skin texture, temperament, or the required style/);
  assert.doesNotMatch(prompt, /outrank the style/);
  assert.doesNotMatch(prompt, /Preserve the appearance of the character in the reference image/);
});

test("blueprint prompt fuses every attached photo into one identity", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 3,
  });
  assert.match(prompt, /all attached reference images/i);
  assert.match(prompt, /same identity/i);
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.match(prompt, /Style is required/);
  assert.doesNotMatch(prompt, /Preserve the appearance of the character in the reference image/);
});

test("image-only create infers the character from the reference and style", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "   ",
    referenceCount: 1,
  });
  assert.doesNotMatch(prompt, /^Character:/m);
  assert.match(prompt, /Derive the character entirely from the attached reference image/);
  assert.match(prompt, /doodle name model sheet/);
  assert.match(prompt, /Style is required/);
  assert.match(prompt, /doodle look/i);
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.doesNotMatch(prompt, /Preserve the appearance/);
});

test("edit mode keeps the sheet identical except for the change", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 1,
    editInstruction: "把睡衣換成紅色",
  });
  assert.match(prompt, /Apply only the change below; keep everything else identical/);
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.match(prompt, /把睡衣換成紅色/);
});

test("edit mode with originals tells the model the sheet is first and photos follow", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 3,
    editInstruction: "把睡衣換成紅色",
  });
  assert.match(prompt, /first reference image is that current character sheet/);
  assert.match(prompt, /original photo/);
  assert.match(prompt, /does not drift/);
  assert.match(prompt, /把睡衣換成紅色/);
});

test("a preloaded user style supplies look and does not resolve that id", () => {
  const custom = renderableFromSystem(testStyle("paper-cutout", {
    look: "torn kraft edges",
  }));
  custom.id = new ObjectId().toHexString();
  resetStyleOverlay();
  try {
    const prompt = buildBlueprintPrompt({ style: custom, description: "a hero" });
    assert.match(prompt, /torn kraft edges/);
    assert.match(prompt, /a hero/);
  } finally {
    installTestStyles();
  }
});

test("chalkboard with a reference stays white chalk, not photo colour", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("chalkboard"),
    description: "x",
    referenceCount: 1,
  });
  assert.match(prompt, /Chalkboard is monochrome/);
  assert.match(prompt, /do not copy hair dye colour/);
  assert.match(prompt, /white chalk stroke/);
  assert.match(prompt, /never as skin tone/);
});

test("blueprint ground stays light and contrasts with the outfit", () => {
  const realistic = renderableFromSystem(testStyle("realistic", {
    canvas: "real-world environment appropriate to the scene, softly lit",
    look: "photorealistic cinematic still",
  }));
  const prompt = buildBlueprintPrompt({
    style: realistic,
    description: "a woman in a black dress",
    referenceCount: 1,
  });
  assert.match(prompt, /flat light solid colour/);
  assert.match(prompt, /clothing/);
  assert.match(prompt, /must not match the outfit/);
  assert.match(prompt, /sheet-ground rule, not a scene named in Background/);
  assert.doesNotMatch(prompt, /follow Background, Rendering/);

  const portrait = buildPortraitPrompt({
    style: realistic,
    description: "a woman in a black dress",
    photoCount: 1,
  });
  assert.match(portrait, /1\.4:1 to 1\.8:1 portrait contrast ratio/);
  assert.match(portrait, /25–40% (?:natural )?shadow falloff/);
  assert.match(portrait, /85mm portrait lens at f\/1\.8/);
  assert.match(portrait, /skin pores/);
  assert.match(portrait, /no film grain/);
  assert.doesNotMatch(portrait, /Even soft front light/);

  for (const prompt of [
    buildBlueprintPrompt({ style: realistic, description: "a woman in a black dress" }),
    buildFullBodyPrompt({
      style: realistic,
      description: "a woman in a black dress",
      photoCount: 0,
    }),
    buildProfilePrompt({ style: realistic, description: "a woman in a black dress" }),
  ]) {
    assert.match(prompt, /50mm lens at f\/4/);
    assert.match(prompt, /Soft directional light and real skin texture stay on the person/);
  }

  const flat = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "a woman in a black dress",
  });
  assert.doesNotMatch(flat, /85mm portrait lens|subtle film grain|Realistic texture/);

  const huge = renderableFromSystem(testStyle("realistic", {
    look: "photorealistic cinematic still ".repeat(80),
    palette: "warm amber and muted teal ".repeat(40),
    negatives: "cartoon plastic skin ".repeat(40),
  }));
  const fitted = buildPortraitPrompt({
    style: huge,
    description: "a woman in a black dress",
    photoCount: 1,
  });
  assert.ok(fitted.length <= 4200, `${fitted.length} chars`);
  assert.match(fitted, /85mm portrait lens at f\/1\.8/);
  assert.match(fitted, /no film grain/);
});

test("editing a sheet replaces a scenic ground with the light sheet colour", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 1,
    editInstruction: "把裙子改成白色",
  });
  assert.match(prompt, /replace only that ground with the light sheet-ground colour/);
  assert.match(prompt, /把裙子改成白色/);
});

test("board wardrobe edit puts the previous images first and ignores the photos' clothes and hair", () => {
  const style = loadedStyle("doodle");
  const spec = {
    identity: "woman",
    face: "oval",
    hair: "black wolf cut",
    skinTone: "light",
    body: "slim",
    marks: "",
    outfit: "black spaghetti strap dress",
    palette: ["#000000"],
  };
  const editInstruction =
    "Hair: curtain bangs; Top: denim halter top. Isolated wardrobe piece alwasheddenimtop.";
  const fullBody = buildFullBodyPrompt({
    style,
    description: "x",
    spec,
    photoCount: 3,
    editInstruction,
    parentImageCount: 2,
  });
  assert.doesNotMatch(fullBody, /Complete the outfit, shoes, and accessories from the photos/);
  assert.doesNotMatch(fullBody, /even when the portrait shows a different hairstyle/);
  assert.match(fullBody, /previous full-body figure/);
  assert.match(fullBody, /Ignore the hair and clothing in the original photos/);
  assert.doesNotMatch(fullBody, /- Outfit: black spaghetti strap dress/);
  assert.doesNotMatch(fullBody, /- Hair: black wolf cut/);
  assert.doesNotMatch(fullBody, /Isolated wardrobe piece/);
  assert.match(fullBody, /denim halter top/);

  const portrait = buildPortraitPrompt({
    style,
    description: "x",
    spec,
    photoCount: 3,
    editInstruction,
    parentImageCount: 1,
  });
  assert.doesNotMatch(portrait, /keep the face, skin texture, hair, framing/);
  assert.match(portrait, /Ignore the hair and clothing in the original photos/);
  assert.doesNotMatch(portrait, /- Outfit: black spaghetti strap dress/);
  assert.doesNotMatch(portrait, /- Hair: black wolf cut/);
  assert.match(portrait, /curtain bangs/);

  // Lower-body-only wardrobe edits must not ask the portrait to draw a skirt or shoes,
  // and chained "\n變更：..." history on `description` must not leak into `Character:`.
  const lowerBodyEdit =
    "Pants: a white tennis skirt with sharp knife pleats; Shoes: Argentine alpargatas";
  const chainedDescription = `a young woman\n變更：${editInstruction}\n變更：${lowerBodyEdit}`;
  const lowerOnlyPortrait = buildPortraitPrompt({
    style,
    description: chainedDescription,
    spec,
    photoCount: 1,
    editInstruction: lowerBodyEdit,
    parentImageCount: 1,
  });
  assert.doesNotMatch(lowerOnlyPortrait, /tennis skirt|alpargatas|denim halter top/);
  assert.match(lowerOnlyPortrait, /Character: a young woman/);
  assert.match(lowerOnlyPortrait, /Never zoom out to full-body/);

  const mixedPortrait = buildPortraitPrompt({
    style,
    description: chainedDescription,
    spec,
    photoCount: 1,
    editInstruction: `${editInstruction}; ${lowerBodyEdit}`,
    parentImageCount: 1,
  });
  assert.match(mixedPortrait, /denim halter top/);
  assert.doesNotMatch(mixedPortrait, /tennis skirt|alpargatas/);
});

test("portrait and full body keep the reference hairstyle", () => {
  const style = loadedStyle("doodle");
  const portrait = buildPortraitPrompt({ style, description: "x", photoCount: 1 });
  assert.match(portrait, /does not change the hair/);
  assert.match(portrait, /Cutting long hair at the frame edge is fine/);
  const fromPhotos = buildFullBodyPrompt({ style, description: "x", photoCount: 1 });
  assert.match(fromPhotos, /even when the portrait shows a different hairstyle/);
  const fromPortrait = buildFullBodyPrompt({ style, description: "x", photoCount: 0 });
  assert.match(fromPortrait, /Copy the face, hair, and visible clothing from that portrait exactly/);
});

test("profile prompt is a full-body standing view on the light sheet ground", () => {
  const prompt = buildProfilePrompt({
    style: loadedStyle("doodle"),
    description: "一個穿藍色格子睡衣的小男孩",
  });
  assert.match(prompt, /full-body standing/);
  assert.match(prompt, /standing straight upright/);
  assert.match(prompt, /gentle little smile/);
  assert.match(prompt, /front view/);
  assert.match(prompt, /hair to the soles of the feet/);
  assert.match(prompt, /flat light solid colour/);
  assert.match(prompt, /小男孩/);
  assert.match(prompt, /Do not copy the turnaround, walk cycle, expression grid/);
  assert.match(prompt, /Do not crop to a head-and-shoulders portrait/);
  assert.doesNotMatch(prompt, /4-pose walk cycle/);
});

test("chalkboard profile stays on the drawing surface", () => {
  const prompt = buildProfilePrompt({
    style: loadedStyle("chalkboard"),
    description: "x",
  });
  assert.match(prompt, /stands on the same drawing surface/);
  assert.doesNotMatch(prompt, /flat light solid colour/);
});

test("chalkboard blueprint sits on a chalkboard, not white", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("chalkboard"),
    description: "x",
    hasReference: false,
  });
  assert.match(prompt, /Background: chalkboard canvas/);
  assert.doesNotMatch(prompt, /flat light solid colour/);
  assert.doesNotMatch(prompt, /Chalkboard is monochrome/);
  const layoutInstructions = prompt
    .split("\n")
    .filter(
      (line) =>
        !["Background:", "Rendering:", "Palette:", "Never:"].some((prefix) =>
          line.startsWith(prefix),
        ),
    )
    .join("\n");
  assert.doesNotMatch(layoutInstructions, /white/i);
});

// Real catalog realistic lines are long; the board prompt must still keep every identity line.
function longRealisticStyle() {
  return renderableFromSystem(
    testStyle("realistic", {
      canvas: `realistic canvas ${"c".repeat(400)}`,
      look: `realistic look ${"l".repeat(900)}`,
      palette: `realistic palette ${"p".repeat(300)}`,
      negatives: `realistic negatives ${"n".repeat(500)}`,
    }),
  );
}

const DETAILED_SPEC = {
  identity: "East Asian woman, early 20s",
  face: "oval face, narrow chin, almond eyes, straight brows, slender nose, soft lips",
  faceDetail:
    "face slightly longer than wide, low forehead, medium eyes about one eye-width apart, slight upward tilt, hooded double lids with a low crease, thin straight brows close above the eyes, low soft nose bridge, nose as wide as the gap between the eyes, short philtrum, mouth reaching the pupils, fuller lower lip, soft cheekbones, narrow tapered chin",
  hair: "reddish-brown, low ponytail, wispy face-framing strands",
  skinTone: "light warm beige, visible natural pores",
  body: "slender, petite",
  marks: "ear piercings",
  outfit: "blue pinstripe bikini top, distressed denim shorts, beaded belly chain",
  palette: ["#3b231d", "#e3bfa6"],
};

test("realistic portrait keeps face geometry and the photo spec within the prompt budget", () => {
  const prompt = buildPortraitPrompt({
    style: longRealisticStyle(),
    description: "",
    spec: DETAILED_SPEC,
    photoCount: 1,
  });
  assert.ok(prompt.length <= 4200, `prompt is ${prompt.length} chars`);
  assert.match(prompt, /- Face geometry: face slightly longer than wide/);
  assert.match(prompt, /- Outfit: blue pinstripe bikini top/);
  assert.match(prompt, /gap between the eyes compared with one eye's width/);
  assert.match(prompt, /Do not beautify/);
  // Likeness comes before the style and light lines, so trimming never cuts it.
  assert.ok(prompt.indexOf("Face geometry") < prompt.indexOf("Realistic texture"));
  assert.ok(prompt.indexOf("Sheet ground") > 0, "light sheet ground survives");
  assert.match(prompt, /keeps the reference person's authentic smile/);
});

test("realistic full body keeps face geometry within the prompt budget", () => {
  const prompt = buildFullBodyPrompt({
    style: longRealisticStyle(),
    description: "",
    spec: DETAILED_SPEC,
    photoCount: 1,
    parentImageCount: 1,
  });
  assert.ok(prompt.length <= 4200, `prompt is ${prompt.length} chars`);
  assert.match(prompt, /- Face geometry:/);
  assert.match(prompt, /Copy the face and skin texture from the portrait/);
  assert.ok(prompt.indexOf("Face geometry") < prompt.indexOf("Realistic texture"));
});
