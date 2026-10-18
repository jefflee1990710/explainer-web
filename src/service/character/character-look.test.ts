import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_CHARACTER_LOOK_PARTS,
  CHARACTER_LOOKS,
  CHARACTER_LOOK_PARTS,
  CHARACTER_WARDROBE_PARTS,
  CHARACTER_VIRAL_PRESETS,
  characterLookPreviewPrompt,
  characterLookPreviewSrc,
  characterLookPrompt,
  characterPoseRevisionPrompt,
  characterPoseSheetPrompt,
  characterWardrobeEditInstruction,
  defaultCharacterLook,
  detectCharacterWardrobePicks,
  isExaggeratedLookOption,
  lookOptionCategory,
  optionsForLookPart,
  randomizeCharacterLook,
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

test("preview prompt isolates that one option with stylish editorial framing and no grotesque options", () => {
  const prompt = characterLookPreviewPrompt("shoes", "boots");
  assert.match(prompt, /dark ankle boots/);
  assert.match(prompt, /No text/);
  assert.match(prompt, /No legs above the ankle/);
  assert.match(prompt, /Photorealistic studio photograph/);
  assert.match(prompt, /Not an illustration/);
  assert.match(prompt, /Plain light grey seamless background/);
  assert.equal(characterLookPreviewSrc("shoes", "boots"), "/character-looks/shoes-boots.webp?v=5");
  assert.match(characterLookPreviewPrompt("hair", "beehive"), /1960s beehive/);
  assert.match(characterLookPreviewPrompt("hair", "hime"), /Japanese hime cut/);
  assert.doesNotMatch(characterLookPreviewPrompt("hair", "braids"), /Do not braid it/);
  assert.match(characterLookPreviewPrompt("hair", "bob"), /Do not braid it/);
  assert.match(characterLookPreviewPrompt("face", "round"), /Only the face shape changes/);
  assert.match(characterLookPreviewPrompt("face", "monolid"), /Only this facial feature changes/);
  assert.match(characterLookPreviewPrompt("face", "japan"), /Japanese features/);
  assert.match(characterLookPreviewPrompt("body", "woman"), /adult woman/);
  assert.match(characterLookPreviewPrompt("pants", "hakama"), /Japanese hakama/);
  assert.match(characterLookPreviewPrompt("shoes", "geta"), /Japanese wooden geta/);
  assert.match(characterLookPreviewPrompt("top", "neochinese"), /Neo-Chinese/i);
  assert.match(characterLookPreviewPrompt("top", "bandhgala"), /Bandhgala/i);
  assert.match(characterLookPreviewPrompt("top", "ankara"), /Ankara/i);
  assert.match(characterLookPreviewPrompt("top", "sapeur"), /La Sape/i);
  assert.match(characterLookPreviewPrompt("top", "techwear"), /Berlin/i);

  // Bizarre / grotesque options are removed
  const removed = [
    ["hair", "tower"],
    ["hair", "horns"],
    ["face", "bugeyes"],
    ["face", "beak"],
    ["body", "giant"],
    ["body", "beanpole"],
    ["shoes", "clown"],
    ["accessory", "fishbowl"],
    ["accessory", "ramen"],
  ] as const;
  for (const [part, id] of removed) {
    assert.equal(
      optionsForLookPart(part).some((opt) => opt.id === id),
      false,
      `${part}:${id} should be removed`,
    );
  }

  for (const part of ALL_CHARACTER_LOOK_PARTS) {
    for (const option of optionsForLookPart(part)) {
      const p = characterLookPreviewPrompt(part, option.id);
      assert.match(p, new RegExp(option.prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(p, /physically impossible/i);
    }
  }
});

test("default look is a complete selection", () => {
  const prompt = characterLookPrompt(defaultCharacterLook());
  assert.match(prompt, /Hair: chin-length straight bob/);
  assert.match(prompt, /Pants: straight blue jeans/);
  assert.match(prompt, /Shoes: white sneakers/);
});

test("pose sheet asks for a single full-body portrait with a matching background", () => {
  const prompt = characterPoseSheetPrompt(defaultCharacterLook());
  assert.match(prompt, /Photorealistic full-body portrait photograph of a single character/);
  assert.match(prompt, /real-world environmental background/);
  assert.match(prompt, /do not draw multiple views, a grid, or an 8-pose sheet/);
  assert.match(prompt, /Hair: chin-length straight bob/);
  assert.match(prompt, /No text/);
});

test("pose revision keeps the full-body portrait and applies the comment", () => {
  const prompt = characterPoseRevisionPrompt(defaultCharacterLook(), "  give her a red jacket  ");
  assert.match(prompt, /Edit the attached photorealistic full-body photograph/);
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

test("characterWardrobeEditInstruction and detectCharacterWardrobePicks handle hair, top, pants, shoes, and accessory", () => {
  const edit = characterWardrobeEditInstruction(
    { hair: "hime", top: "neochinese", pants: "wide", shoes: "boots", accessory: "eyewear" },
    "keep warm smile",
  );
  assert.match(edit, /Hair: Japanese hime cut/);
  assert.match(edit, /Top: a 2020s Neo-Chinese/);
  assert.match(edit, /Pants: draped high-waisted wide-leg trousers/);
  assert.match(edit, /Shoes: dark ankle boots/);
  assert.match(edit, /Accessory: sleek vintage tortoiseshell optical glasses/);
  assert.match(edit, /keep warm smile$/);

  const detected = detectCharacterWardrobePicks(edit);
  assert.deepEqual(detected, {
    hair: "hime",
    top: "neochinese",
    pants: "wide",
    shoes: "boots",
    accessory: "eyewear",
  });
});

test("extra wardrobe options stay unique so one prompt cannot hide inside another", () => {
  assert.equal(optionsForLookPart("top").length, 28 + 90);
  assert.equal(optionsForLookPart("pants").length, 16 + 45);
  assert.equal(optionsForLookPart("shoes").length, 19 + 40);
  assert.equal(optionsForLookPart("accessory").length, 8 + 25);
  assert.equal(lookOptionCategory("top", "kimono"), "extreme");
  assert.equal(lookOptionCategory("top", "bomber"), "stylized");
  assert.equal(lookOptionCategory("top", "oxford"), "classic");
  assert.equal(lookOptionCategory("pants", "kilt"), "extreme");
  assert.equal(lookOptionCategory("pants", "culottes"), "stylized");
  assert.equal(lookOptionCategory("pants", "pencilskirt"), "classic");
  assert.equal(lookOptionCategory("shoes", "juttis"), "extreme");
  assert.equal(lookOptionCategory("shoes", "maryjanes"), "stylized");
  assert.equal(lookOptionCategory("shoes", "derby"), "classic");
  assert.equal(lookOptionCategory("accessory", "hijab"), "extreme");
  assert.equal(lookOptionCategory("accessory", "bucket"), "stylized");
  assert.equal(lookOptionCategory("accessory", "fedora"), "classic");

  for (const part of CHARACTER_WARDROBE_PARTS) {
    const options = optionsForLookPart(part);
    assert.equal(new Set(options.map((option) => option.id)).size, options.length, part);
    for (let i = 0; i < options.length; i++) {
      for (let j = 0; j < options.length; j++) {
        if (i === j) continue;
        assert.equal(
          options[j].prompt.includes(options[i].prompt),
          false,
          `${part} prompt of ${options[i].id} sits inside ${options[j].id}`,
        );
      }
    }
  }
});

test("viral presets, extra parts, gender, styling vibe dial, and global fashion mix work as expected", () => {
  assert.equal(ALL_CHARACTER_LOOK_PARTS.length, 8);
  assert.equal(CHARACTER_VIRAL_PRESETS.length, 4);
  for (const preset of CHARACTER_VIRAL_PRESETS) {
    const prompt = characterLookPrompt(preset.selection);
    assert.match(prompt, /Styling vibe/);
    assert.match(prompt, /Gender: adult (woman|man)/);
  }
  const malePrompt = characterLookPrompt({ ...defaultCharacterLook(), gender: "male" });
  assert.match(malePrompt, /Gender: adult man \(male\)\./);
  const femaleSheet = characterPoseSheetPrompt(defaultCharacterLook());
  assert.match(femaleSheet, /Gender: adult woman \(female\)\./);
  assert.match(femaleSheet, /Kodak Gold 200/);
  const locked = randomizeCharacterLook(
    { ...defaultCharacterLook(), hair: "bob" },
    { locked: { hair: true }, extremeOnly: true, rand: () => 0 },
  );
  assert.equal(locked.hair, "bob");
  assert.equal(locked.exaggeration, "10x");
  assert.equal(isExaggeratedLookOption("top", locked.top ?? ""), true);
  assert.equal(lookOptionCategory("top", "neochinese"), "extreme");
  assert.equal(lookOptionCategory("top", "hoodie"), "stylized");
  assert.equal(lookOptionCategory("hair", "bob"), "classic");
  for (const part of ALL_CHARACTER_LOOK_PARTS) {
    for (const option of optionsForLookPart(part)) {
      assert.match(characterLookPreviewPrompt(part, option.id), /Plain light grey seamless background/);
    }
  }
});
