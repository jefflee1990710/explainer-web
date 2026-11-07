import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  buildBaseChatSystemPrompt,
  fallbackBaseEditPlan,
  promoteVersionToBase,
} from "@/service/character/base-chat";
import type { Character } from "@/model/character";

test("buildBaseChatSystemPrompt includes character name, current prompt, and spec fields", () => {
  const sys = buildBaseChatSystemPrompt({
    name: "Aria",
    currentPrompt: "Young woman in white tee",
    currentSpec: {
      identity: "East Asian woman, mid 20s",
      face: "oval face, warm eyes",
      hair: "long black hair",
      skinTone: "warm ivory",
      body: "slim build",
      marks: "none",
      outfit: "white cotton t-shirt, blue jeans",
      palette: ["white", "blue"],
    },
  });
  assert.match(sys, /Aria/);
  assert.match(sys, /Young woman in white tee/);
  assert.match(sys, /long black hair/);
  assert.match(sys, /editInstruction/);
});

test("fallbackBaseEditPlan constructs a clean edit plan when LLM is unavailable", () => {
  const plan = fallbackBaseEditPlan({
    currentPrompt: "Young woman in white tee",
    message: "Add gold-rimmed glasses and shoulder-length bob hair",
    currentSpec: {
      identity: "East Asian woman, mid 20s",
      face: "oval face",
      hair: "long black hair",
      skinTone: "warm ivory",
      body: "slim build",
      marks: "none",
      outfit: "white tee",
      palette: ["white"],
    },
  });
  assert.match(plan.editInstruction, /gold-rimmed glasses/i);
  assert.match(plan.updatedPrompt, /gold-rimmed glasses/i);
  assert.ok(plan.reply.length > 0);
});

test("promoteVersionToBase sets baseVersionId, defaultVersionId, styleDefaults.realistic, and clears candidate/parent/reference flags on the promoted version", () => {
  const v1Id = new ObjectId();
  const candId = new ObjectId();
  const char: Character = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "u1",
    name: "Aria",
    styleId: "realistic",
    baseVersionId: v1Id,
    defaultVersionId: v1Id,
    styleDefaults: { realistic: v1Id },
    versions: [
      {
        id: v1Id,
        styleId: "realistic",
        prompt: "v1 base",
        blueprintKind: "board",
        portraitUrl: "https://blob/v1-portrait.png",
        profileUrl: "https://blob/v1-standing.png",
        blueprintUrl: "https://blob/v1-board.png",
        status: "completed",
        creditsCharged: true,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: candId,
        styleId: "realistic",
        parentVersionId: v1Id,
        isBaseCandidate: true,
        prompt: "v2 candidate with glasses",
        editInstruction: "Add round gold glasses",
        referenceImageUrl: "https://blob/chat-ref.png",
        referenceImageUrls: ["https://blob/chat-ref.png"],
        blueprintKind: "board",
        portraitUrl: "https://blob/v2-portrait.png",
        profileUrl: "https://blob/v2-standing.png",
        blueprintUrl: "https://blob/v2-board.png",
        status: "completed",
        creditsCharged: true,
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const next = promoteVersionToBase(char, candId);
  assert.ok(next);
  assert.equal(next.baseVersionId?.toHexString(), candId.toHexString());
  assert.equal(next.defaultVersionId?.toHexString(), candId.toHexString());
  assert.equal(next.styleDefaults?.realistic?.toHexString(), candId.toHexString());
  const promoted = next.versions.find((v) => v.id.equals(candId))!;
  assert.equal(promoted.isBaseCandidate, undefined);
  assert.equal(promoted.parentVersionId, undefined);
  assert.equal(promoted.referenceImageUrl, undefined);
  assert.equal(promoted.referenceImageUrls, undefined);
});
