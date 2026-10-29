import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  runLifeShotJob,
  toPublicLifePresets,
  toPublicLifeStyles,
  toPublicShot,
} from "@/service/character/life";
import type { Character } from "@/model/character";
import type { LifeShot } from "@/model/life-shot";

test("toPublicShot defaults legacy records without status to completed when resultUrl exists", () => {
  const shot: LifeShot = {
    _id: new ObjectId("6ad41b30702dcbe4c357a7fe"),
    userId: new ObjectId("6ad41b30702dcbe4c357a7ff"),
    clerkUserId: "user_1",
    characterId: new ObjectId("6ad41b30702dcbe4c357a7fa"),
    characterName: "Scro",
    place: "Tokyo",
    kind: "selfie",
    source: "upload",
    sceneImageUrl: "https://example.com/scene.jpg",
    resultUrl: "https://example.com/result.png",
    createdAt: new Date("2026-10-21T00:00:00.000Z"),
  };
  const pub = toPublicShot(shot);
  assert.equal(pub.status, "completed");
  assert.equal(pub.error, null);
});

test("runLifeShotJob marks the shot completed and saves the persisted PNG URL", async () => {
  const shotId = new ObjectId("6ad41b30702dcbe4c357a7fe");
  const updates: Array<{ filter: unknown; update: unknown }> = [];
  let refunded = false;

  await runLifeShotJob(
    {
      shotId,
      clerkUserId: "user_1",
      characterHexId: "6ad41b30702dcbe4c357a7fa",
      prompt: "A real vertical Instagram photo shot on an iPhone.",
      refs: ["https://example.com/id.png"],
      spendKey: "spend_123",
    },
    {
      submitImage: async () => ({
        images: [{ url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" }],
      }),
      persistPng: async (_sourceUrl, key) => `https://blob.vercel-storage.com/${key}`,
      updateShot: async (filter, update) => {
        updates.push({ filter, update });
      },
      refund: async () => {
        refunded = true;
      },
      revalidate: () => {},
    },
  );

  assert.equal(refunded, false);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0]?.filter, { _id: shotId, status: "generating" });
  assert.deepEqual(updates[0]?.update, {
    $set: {
      status: "completed",
      resultUrl:
        "https://blob.vercel-storage.com/explainer/life/6ad41b30702dcbe4c357a7fa/6ad41b30702dcbe4c357a7fe.png",
    },
    $unset: { error: "", spendKey: "" },
  });
});

test("runLifeShotJob refunds credits and marks the shot failed when provider throws", async () => {
  const shotId = new ObjectId("6ad41b30702dcbe4c357a7fe");
  const updates: Array<{ filter: unknown; update: unknown }> = [];
  const refunds: Array<{ clerkUserId: string; amount: number; key: string }> = [];

  await runLifeShotJob(
    {
      shotId,
      clerkUserId: "user_1",
      characterHexId: "6ad41b30702dcbe4c357a7fa",
      prompt: "A real vertical Instagram photo shot on an iPhone.",
      refs: ["https://example.com/id.png"],
      spendKey: "spend_456",
    },
    {
      submitImage: async () => {
        throw new Error("OpenRouter timeout");
      },
      persistPng: async () => "https://blob.vercel-storage.com/unused.png",
      updateShot: async (filter, update) => {
        updates.push({ filter, update });
      },
      refund: async (clerkUserId, amount, key) => {
        refunds.push({ clerkUserId, amount, key });
      },
      revalidate: () => {},
    },
  );

  assert.equal(refunds.length, 1);
  assert.equal(refunds[0]?.clerkUserId, "user_1");
  assert.equal(refunds[0]?.key, "spend_456");
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0]?.filter, { _id: shotId, status: "generating" });
  assert.deepEqual(updates[0]?.update, {
    $set: {
      status: "failed",
      error: "OpenRouter timeout",
    },
    $unset: { spendKey: "" },
  });
});

test("toPublicLifeStyles and toPublicLifePresets expose all supported styles and additional completed versions for an AI influencer", () => {
  const vReal1 = new ObjectId("6ae0d86cf75348b44a26322b");
  const vPaper1 = new ObjectId("6ae14c67432f67b5ccf3496b");
  const vReal2 = new ObjectId("6ae14d3b7d449728658a0f98");
  const vPaper2 = new ObjectId("6ae24eb4e6e724cfa700ba77");

  const character: Character = {
    _id: new ObjectId("6ae0d86cf75348b44a26322c"),
    userId: new ObjectId("6ad41b30702dcbe4c357a7ff"),
    clerkUserId: "user_1",
    name: "Scro",
    styleId: "realistic",
    defaultVersionId: vReal2,
    styleDefaults: {
      realistic: vReal2,
      "paper-cutout": vPaper2,
    },
    versions: [
      {
        id: vReal1,
        styleId: "realistic",
        prompt: "base realistic",
        status: "completed",
        creditsCharged: true,
        blueprintUrl: "https://blob/real1.png",
        portraitUrl: "https://blob/real1-portrait.png",
        createdAt: new Date("2026-10-28T01:00:00Z"),
      },
      {
        id: vPaper1,
        styleId: "paper-cutout",
        prompt: "base paper",
        status: "completed",
        creditsCharged: true,
        blueprintUrl: "https://blob/paper1.png",
        portraitUrl: "https://blob/paper1-portrait.png",
        createdAt: new Date("2026-10-28T02:00:00Z"),
      },
      {
        id: vReal2,
        styleId: "realistic",
        prompt: "edited realistic",
        editInstruction: "Top: Navy blazer. Isolated wardrobe piece cw_123.",
        status: "completed",
        creditsCharged: true,
        blueprintUrl: "https://blob/real2.png",
        portraitUrl: "https://blob/real2-portrait.png",
        createdAt: new Date("2026-10-28T03:00:00Z"),
      },
      {
        id: vPaper2,
        styleId: "paper-cutout",
        prompt: "edited paper",
        editInstruction: "Top: Navy blazer; Pants: Grey shorts.",
        status: "completed",
        creditsCharged: true,
        blueprintUrl: "https://blob/paper2.png",
        portraitUrl: "https://blob/paper2-portrait.png",
        createdAt: new Date("2026-10-28T04:00:00Z"),
      },
    ],
    createdAt: new Date("2026-10-28T00:00:00Z"),
    updatedAt: new Date("2026-10-28T04:00:00Z"),
  };

  const styles = toPublicLifeStyles(character);
  assert.deepEqual(
    styles.map((s) => ({ styleId: s.styleId, versionId: s.versionId })),
    [
      { styleId: "realistic", versionId: vReal2.toHexString() },
      { styleId: "paper-cutout", versionId: vPaper2.toHexString() },
    ],
  );

  const presets = toPublicLifePresets(character);
  assert.equal(presets.length, 2);
  assert.deepEqual(
    presets.map((p) => ({ styleId: p.styleId, versionId: p.versionId })),
    [
      { styleId: "paper-cutout", versionId: vPaper1.toHexString() },
      { styleId: "realistic", versionId: vReal1.toHexString() },
    ],
  );
});
