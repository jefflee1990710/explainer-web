import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import test from "node:test";
import {
  customWardrobeOptionId,
  parseCustomWardrobeHexId,
  toPublicCustomWardrobeItem,
} from "@/model/custom-wardrobe-item";
import {
  characterWardrobeEditInstruction,
  sanitizeWardrobePicks,
  wardrobePickPrompts,
} from "@/service/character/character-look";
import { buildCustomLookStudioPrompt } from "@/service/character/custom-wardrobe";

test("customWardrobeOptionId and parseCustomWardrobeHexId round-trip 24-hex ObjectIds", () => {
  const oid = new ObjectId("6adafbde2925385c6a62ad7b");
  const optionId = customWardrobeOptionId(oid.toHexString());
  assert.equal(optionId, "cw_6adafbde2925385c6a62ad7b");
  assert.equal(parseCustomWardrobeHexId(optionId), "6adafbde2925385c6a62ad7b");
  assert.equal(parseCustomWardrobeHexId("bob"), null);
  assert.equal(parseCustomWardrobeHexId("cw_nothex"), null);

  const pub = toPublicCustomWardrobeItem({
    _id: oid,
    userId: oid,
    clerkUserId: "user_1",
    part: "top",
    category: "stylized",
    name: "Cropped Tweed Jacket",
    nameZh: "法式粗花呢短外套",
    prompt: "Cropped ivory bouclé tweed jacket with gold buttons. Isolated wardrobe piece cw_6adafbde2925385c6a62ad7b.",
    referenceImageUrl: "https://blob.test/ref.webp",
    previewImageUrl: "https://blob.test/preview.webp",
    createdAt: new Date("2026-10-24T00:00:00Z"),
    updatedAt: new Date("2026-10-24T00:00:00Z"),
  });
  assert.equal(pub.optionId, "cw_6adafbde2925385c6a62ad7b");
  assert.equal(pub.nameZh, "法式粗花呢短外套");
});

test("sanitizeWardrobePicks, wardrobePickPrompts, and characterWardrobeEditInstruction support custom cw_ items", () => {
  const customTopId = "cw_6adafbde2925385c6a62ad7b";
  const customHairId = "cw_6adafbde2925385c6a62ad7c";
  const picks = sanitizeWardrobePicks({
    top: customTopId,
    hair: customHairId,
    shoes: "sneakers",
    accessory: "cw_invalid",
  });
  assert.deepEqual(picks, {
    top: customTopId,
    hair: customHairId,
    shoes: "sneakers",
  });

  const promptMap = new Map<string, string>([
    [customTopId, "Cropped ivory bouclé tweed jacket with gold buttons."],
    [customHairId, "Sleek low chignon bun with wispy bangs."],
  ]);

  const resolvedPrompts = wardrobePickPrompts(picks, promptMap);
  assert.equal(resolvedPrompts.top, "Cropped ivory bouclé tweed jacket with gold buttons.");
  assert.equal(resolvedPrompts.hair, "Sleek low chignon bun with wispy bangs.");
  assert.equal(resolvedPrompts.shoes, "white sneakers");

  const edit = characterWardrobeEditInstruction(picks, "add warm lighting", undefined, promptMap);
  assert.match(edit, /Hair: Sleek low chignon bun/);
  assert.match(edit, /Top: Cropped ivory bouclé tweed jacket/);
  assert.match(edit, /Shoes: white sneakers/);
  assert.match(edit, /add warm lighting$/);
});

test("buildCustomLookStudioPrompt formats isolated 1:1 studio prompts for all 5 wardrobe parts", () => {
  for (const part of ["hair", "top", "pants", "shoes", "accessory"] as const) {
    const studioPrompt = buildCustomLookStudioPrompt(part, "Vintage olive linen piece.");
    assert.match(studioPrompt, /Photorealistic studio photograph, 1:1/);
    assert.match(studioPrompt, /Plain light grey seamless background/);
    assert.match(studioPrompt, /Vintage olive linen piece/);
  }
});
