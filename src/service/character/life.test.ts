import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { runLifeShotJob, toPublicShot } from "@/service/character/life";
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
