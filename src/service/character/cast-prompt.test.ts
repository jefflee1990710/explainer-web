import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  castBlockForPhaseA,
  castLineForPhaseB,
  castParagraphForFrames,
  castReferenceUrls,
  characterLockFromCast,
  characterReferenceUrls,
  frameLockReferenceUrls,
  sceneImageReferenceUrls,
  directorBlueprintSceneRules,
  directorImageParts,
  loadDirectorImageParts,
  frameCharacterLockLine,
  phaseASoloCharacterNote,
} from "@/service/character/cast-prompt";
import type { CastMember } from "@/model/character";

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

test("phase A cast block names every member and forbids inventing looks", () => {
  const block = castBlockForPhaseA(cast);
  assert.ok(block);
  assert.match(block, /^Cast \(use these exact names/);
  assert.match(block, /- 小明: 七歲男孩，藍格子睡衣/);
  assert.match(block, /appearance still follows the attached reference sheet/);
  assert.match(block, /characterLock MUST only list the cast names/);
  assert.match(block, /never invent outfit or hairstyle details/);
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
  assert.match(block, /Do NOT invent or describe hair, face, clothing/);
  assert.match(block, /characterLock MUST only list the cast names/);
  assert.match(block, /BLUEPRINT \/ reference sheet only/);
  assert.match(block, /exactly ONE instance of each named/);
  assert.match(block, /frozen moments/);
  assert.doesNotMatch(block, /- Math Tutor: $/m);
});

test("director blueprint scene rules forbid staging the pose sheet", () => {
  const text = directorBlueprintSceneRules().join("\n");
  assert.match(text, /not a scene to copy/);
  assert.match(text, /exactly ONE instance/);
  assert.match(text, /motionCamera only/);
});

test("characterLockFromCast never invents outfit details", () => {
  const lock = characterLockFromCast(cast);
  assert.match(lock, /小明、阿花/);
  assert.match(lock, /角色藍圖為準/);
  assert.doesNotMatch(lock, /睡衣|眼鏡|連身裙/);
});

test("phase B line lists names with blueprint urls or none", () => {
  assert.equal(
    castLineForPhaseB(cast),
    "Cast reference sheets: 小明 (https://blob/a.png); 阿花 (https://blob/b.png)",
  );
  assert.equal(castLineForPhaseB([]), "Cast reference sheets: none");
});

test("frame paragraph and reference urls follow the cast", () => {
  const text = castParagraphForFrames(cast).join("\n");
  assert.match(text, /Cast reference sheets are attached/);
  assert.match(text, /the ONLY source of truth for how each character looks/);
  assert.match(text, /Ignore any clothing, hair, or style wording/);
  assert.match(text, /小明, 阿花/);
  assert.match(text, /Do not invent a replacement hero or redesign their outfit/);
  assert.deepEqual(castParagraphForFrames(undefined), []);
  assert.deepEqual(castReferenceUrls(cast), ["https://blob/a.png", "https://blob/b.png"]);
});

test("frame paragraph says the blueprint is appearance reference only, not a scene to copy", () => {
  const text = castParagraphForFrames(cast).join("\n");
  assert.match(text, /BLUEPRINT \/ reference sheet only/);
  assert.match(text, /not a scene to copy/i);
  assert.match(text, /exactly ONE instance of each named/);
  assert.match(text, /Never copy the sheet layout/);
});

test("frameCharacterLockLine omits invented Phase A look text when cast exists", () => {
  assert.equal(
    frameCharacterLockLine(cast, true, "小明穿鼠尾草綠連身裙"),
    "Locked cast (names only; appearance follows the attached blueprint only): 小明, 阿花.",
  );
  assert.match(
    frameCharacterLockLine(undefined, true, "invented look"),
    /attached character guideline only/,
  );
  assert.match(
    frameCharacterLockLine(undefined, false, "lock text"),
    /Locked character \(must look identical in every frame\): lock text/,
  );
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

test("frameLockReferenceUrls always sends the character blueprint", () => {
  assert.deepEqual(frameLockReferenceUrls({ cast }), [
    "https://blob/a.png",
    "https://blob/b.png",
  ]);
});

test("sceneImageReferenceUrls keeps annotated then lock order", () => {
  assert.deepEqual(
    sceneImageReferenceUrls({
      annotatedUrl: "https://x/ann.png",
      lockUrls: ["https://blob/a.png"],
    }),
    ["https://x/ann.png", "https://blob/a.png"],
  );
  assert.deepEqual(
    sceneImageReferenceUrls({
      lockUrls: ["https://blob/a.png"],
    }),
    ["https://blob/a.png"],
  );
});

test("directorImageParts keeps valid character urls as image parts", () => {
  const parts = directorImageParts(["https://blob/a.png", "not-a-url"]);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].type, "image");
  assert.equal(parts[0].image.href, "https://blob/a.png");
});

test("loadDirectorImageParts fetches bytes so the AI SDK does not require undici", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(bytes, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }) as typeof fetch;
  try {
    const parts = await loadDirectorImageParts(["https://blob/a.png", "not-a-url"]);
    assert.deepEqual(calls, ["https://blob/a.png"]);
    assert.equal(parts.length, 1);
    assert.equal(parts[0].type, "image");
    assert.deepEqual(parts[0].image, bytes);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadDirectorImageParts fails clearly when a reference image cannot be downloaded", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("missing", { status: 404 })) as typeof fetch;
  try {
    await assert.rejects(
      () => loadDirectorImageParts(["https://blob/a.png"]),
      /無法下載角色參考圖/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("phase A solo note asks the director to follow an attached image", () => {
  assert.match(phaseASoloCharacterNote("https://blob/c.png"), /A character reference image is attached/);
  assert.match(phaseASoloCharacterNote("https://blob/c.png"), /do NOT invent hair/);
  assert.match(phaseASoloCharacterNote(), /skill's default character/);
});
