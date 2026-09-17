import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  castBlockForPhaseA,
  castLineForPhaseB,
  castParagraphForFrames,
  castReferenceUrls,
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
  assert.equal(castBlockForPhaseA([]), null);
  assert.equal(castBlockForPhaseA(undefined), null);
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
  assert.match(lines[1], /小明, 阿花/);
  assert.deepEqual(castParagraphForFrames(undefined), []);
  assert.deepEqual(castReferenceUrls(cast), ["https://blob/a.png", "https://blob/b.png"]);
});
