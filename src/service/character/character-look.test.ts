import assert from "node:assert/strict";
import test from "node:test";
import {
  CHARACTER_LOOKS,
  CHARACTER_LOOK_PARTS,
  characterLookPreviewPrompt,
  characterLookPreviewSrc,
  characterLookPrompt,
  characterPoseRevisionPrompt,
  characterPoseSheetPrompt,
  defaultCharacterLook,
} from "@/service/character/character-look";
import { poseRevisionComment, poseSheetImageBuffer } from "@/service/character/pose-sheet";

test("character look prompt names every selected part", () => {
  const prompt = characterLookPrompt({
    hair: "bun",
    face: "heart",
    body: "petite",
    pants: "shorts",
    shoes: "sandals",
  });
  assert.match(prompt, /Hair: hair pulled into a round top bun/);
  assert.match(prompt, /Face: heart-shaped face/);
  assert.match(prompt, /Body: short petite build/);
  assert.match(prompt, /Pants: knee-length shorts/);
  assert.match(prompt, /Shoes: open sandals/);
  assert.match(prompt, /Do not swap the hair, face shape, build, pants, or shoes/);
  for (const part of CHARACTER_LOOK_PARTS) {
    assert.match(prompt, new RegExp(`^${part[0].toUpperCase()}${part.slice(1)}:`, "m"));
  }
});

test("preview prompt isolates that one option", () => {
  const prompt = characterLookPreviewPrompt("shoes", "boots");
  assert.match(prompt, /dark ankle boots/);
  assert.match(prompt, /No text/);
  assert.match(prompt, /No legs above the ankle/);
  assert.match(prompt, /Photorealistic studio photograph/);
  assert.match(prompt, /Not an illustration/);
  assert.equal(characterLookPreviewSrc("shoes", "boots"), "/character-looks/shoes-boots.webp?v=3");
  assert.match(characterLookPreviewPrompt("hair", "tower"), /physically impossible and extremely exaggerated/);
  assert.match(characterLookPreviewPrompt("hair", "tower"), /skyscraper/);
  assert.match(characterLookPreviewPrompt("hair", "beehive"), /1960s beehive/);
  assert.match(characterLookPreviewPrompt("hair", "hime"), /Japanese hime cut/);
  assert.doesNotMatch(characterLookPreviewPrompt("hair", "braids"), /Do not braid it/);
  assert.match(characterLookPreviewPrompt("hair", "bob"), /Do not braid it/);
  assert.match(characterLookPreviewPrompt("face", "round"), /Only the face shape changes/);
  assert.match(characterLookPreviewPrompt("face", "monolid"), /Only this facial feature changes/);
  assert.match(characterLookPreviewPrompt("face", "japan"), /Japanese features/);
  assert.match(characterLookPreviewPrompt("face", "bugeyes"), /physically impossible and extremely exaggerated/);
  assert.match(characterLookPreviewPrompt("face", "bugeyes"), /Not a caricature of any nationality/);
  assert.match(characterLookPreviewPrompt("body", "strong"), /physically impossible and extremely exaggerated/);
  assert.match(characterLookPreviewPrompt("body", "wedge"), /impossible inverted triangle/);
  assert.match(characterLookPreviewPrompt("body", "woman"), /adult woman/);
  assert.match(characterLookPreviewPrompt("pants", "hakama"), /Japanese hakama/);
  assert.match(characterLookPreviewPrompt("pants", "balloon"), /physically impossible and extremely exaggerated/);
  assert.match(characterLookPreviewPrompt("shoes", "geta"), /Japanese wooden geta/);
  assert.match(characterLookPreviewPrompt("shoes", "clown"), /physically impossible and extremely exaggerated/);
  for (const part of CHARACTER_LOOK_PARTS) {
    for (const option of CHARACTER_LOOKS[part]) {
      assert.match(characterLookPreviewPrompt(part, option.id), new RegExp(option.prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
});

test("default look is a complete selection", () => {
  const prompt = characterLookPrompt(defaultCharacterLook());
  assert.match(prompt, /Hair: chin-length straight bob/);
  assert.match(prompt, /Pants: straight blue jeans/);
  assert.match(prompt, /Shoes: white sneakers/);
});

test("pose sheet asks for four views plus four different poses", () => {
  const prompt = characterPoseSheetPrompt(defaultCharacterLook());
  assert.match(prompt, /two rows of four full-body figures/);
  assert.match(prompt, /front view, left side, back view, right side/);
  assert.match(prompt, /walking toward the camera mid-step/);
  assert.match(prompt, /both arms stretched straight overhead/);
  assert.match(prompt, /hands on hips/);
  assert.match(prompt, /deep squat/);
  assert.match(prompt, /Do not repeat the standing turnaround/);
  assert.match(prompt, /Hair: chin-length straight bob/);
  assert.match(prompt, /No text/);
});

test("pose revision keeps the sheet and applies the comment", () => {
  const prompt = characterPoseRevisionPrompt(defaultCharacterLook(), "  give her a red jacket  ");
  assert.match(prompt, /Edit the attached photorealistic photograph/);
  assert.match(prompt, /Change only what this comment asks/);
  assert.match(prompt, /Comment: give her a red jacket/);
  assert.match(prompt, /Hair: chin-length straight bob/);
  assert.equal(poseRevisionComment("  wave  "), "wave");
  assert.throws(() => poseRevisionComment("   "), /請寫下要改的地方/);
  assert.throws(() => poseRevisionComment("a".repeat(401)), /修改意見太長/);
  const bytes = poseSheetImageBuffer("data:image/webp;base64,AAAA");
  assert.equal(bytes.length, 3);
  assert.throws(() => poseSheetImageBuffer("https://example.com/a.webp"), /姿勢圖格式不正確/);
});
