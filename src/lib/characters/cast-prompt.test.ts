import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  castBlockForPhaseA,
  castLineForPhaseB,
  castParagraphForFrames,
  castReferenceUrls,
  characterReferenceUrls,
  directorImageParts,
  phaseASoloCharacterNote,
} from "./cast-prompt";
import type { CastMember } from "@/types/character";

const cast: CastMember[] = [
  {
    characterId: new ObjectId(),
    versionId: new ObjectId(),
    name: "小明",
    blueprintUrl: "https://blob/a.png",
    prompt: "七歲男孩，藍格子睡衣",
  },
  {
    characterId: new ObjectId(),
    versionId: new ObjectId(),
    name: "阿花",
    blueprintUrl: "https://blob/b.png",
    prompt: "戴眼鏡的女孩",
  },
];

test("phase A cast block names every member and asks for a lock summary", () => {
  const block = castBlockForPhaseA(cast);
  assert.ok(block);
  assert.match(block, /^Cast \(use these exact names/);
  assert.match(block, /- 小明: 七歲男孩，藍格子睡衣/);
  assert.match(block, /- 阿花: 戴眼鏡的女孩/);
  assert.match(block, /characterLock/);
  assert.match(block, /You MUST inspect them and follow those exact characters when planning every scene/);
  assert.equal(castBlockForPhaseA([]), null);
  assert.equal(castBlockForPhaseA(undefined), null);
});

test("phase A cast block never lets the director invent looks for an undescribed member", () => {
  const imageOnly: CastMember[] = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Math Tutor",
      blueprintUrl: "https://blob/c.png",
      // Image-only character: no text description was ever written.
      prompt: "",
    },
  ];
  const block = castBlockForPhaseA(imageOnly)!;
  assert.match(block, /- Math Tutor: \(appearance defined only by the attached reference sheet\)/);
  assert.match(block, /Do NOT invent or describe hair, face, clothing, accessories, gender or age/);
  assert.match(block, /characterLock must only list the cast names/);
  assert.doesNotMatch(block, /- Math Tutor: $/m);
});

test("phase A cast block still summarises described members", () => {
  const block = castBlockForPhaseA(cast)!;
  assert.match(block, /Write characterLock as a compact summary of the cast above/);
  assert.doesNotMatch(block, /appearance defined only by the attached reference sheet/);
});

test("phase B line lists names with blueprint urls or none", () => {
  assert.equal(
    castLineForPhaseB(cast),
    "Cast reference sheets: 小明 (https://blob/a.png); 阿花 (https://blob/b.png)",
  );
  assert.equal(castLineForPhaseB([]), "Cast reference sheets: none");
});

test("frame paragraph and reference urls follow the cast", () => {
  const lines = castParagraphForFrames(cast);
  assert.match(lines[0], /Cast reference sheets are attached/);
  assert.match(lines[0], /the ONLY source of truth for how each character looks/);
  assert.match(lines[0], /the reference sheet wins/);
  assert.match(lines[1], /小明, 阿花/);
  assert.match(lines[2], /Plan this scene around these exact characters/);
  assert.deepEqual(castParagraphForFrames(undefined), []);
  assert.deepEqual(castReferenceUrls(cast), ["https://blob/a.png", "https://blob/b.png"]);
});

test("characterReferenceUrls prefers the selected cast over a still", () => {
  assert.deepEqual(
    characterReferenceUrls({
      cast,
      characterStillUrl: "https://blob/still.png",
      characterImageUrl: "https://blob/upload.png",
    }),
    ["https://blob/a.png", "https://blob/b.png"],
  );
  assert.deepEqual(
    characterReferenceUrls({
      characterStillUrl: "https://blob/still.png",
      characterImageUrl: "https://blob/upload.png",
    }),
    ["https://blob/still.png", "https://blob/upload.png"],
  );
});

test("directorImageParts keeps valid character urls as image parts", () => {
  const parts = directorImageParts(["https://blob/a.png", "not-a-url"]);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].type, "image");
  assert.equal(parts[0].image.href, "https://blob/a.png");
});

test("phase A solo note asks the director to follow an attached image", () => {
  assert.match(phaseASoloCharacterNote("https://blob/c.png"), /A character reference image is attached/);
  assert.match(phaseASoloCharacterNote("https://blob/c.png"), /follow it when planning every scene/);
  assert.match(phaseASoloCharacterNote(), /default locked everyman/);
});
