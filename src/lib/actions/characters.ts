"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/lib/billing/credits";
import { submitCharacterVersion } from "@/lib/characters/generate";
import { failCharacterVersion } from "@/lib/characters/sync";
import { canSetDefault } from "@/lib/characters/versions";
import { charactersCollection, generationJobsCollection } from "@/lib/collections";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
} from "@/lib/higgsfield/generate";
import { applyJobStatus } from "@/lib/higgsfield/pipeline";
import { toPublicCharacter, type PublicCharacter } from "@/lib/serialize";
import { isStyleId } from "@/lib/styles";
import type { Character, CharacterVersion } from "@/types/character";

const NAME_MAX = 40;
const PROMPT_MAX = 1200;
// gpt-image sheets finish in 1–2 minutes; anything older is treated as lost.
const STALE_AFTER_MS = 15 * 60 * 1000;

export type CharacterResult =
  | { ok: true; character: PublicCharacter }
  | { ok: false; error: string };

function revalidateCharacter(characterId: string) {
  revalidatePath("/app/characters");
  revalidatePath(`/app/characters/${characterId}`);
  revalidatePath("/app/billing");
}

function fail(error: unknown, fallback: string): CharacterResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

async function ownedCharacter(characterId: string, clerkUserId: string) {
  if (!ObjectId.isValid(characterId)) return null;
  const characters = await charactersCollection();
  return (await characters.findOne({
    _id: new ObjectId(characterId),
    clerkUserId,
  })) as Character | null;
}

async function reload(characterId: ObjectId): Promise<CharacterResult> {
  const characters = await charactersCollection();
  const character = (await characters.findOne({ _id: characterId })) as Character | null;
  if (!character) return { ok: false, error: "角色不存在" };
  return { ok: true, character: toPublicCharacter(character) };
}

// Submit a queued version; on provider failure mark it failed and refund.
async function submitOrFail(character: Character, version: CharacterVersion) {
  try {
    await submitCharacterVersion(character, version);
  } catch (error) {
    const characters = await charactersCollection();
    const message = error instanceof Error ? error.message : "藍圖送出失敗";
    const claimed = await characters.updateOne(
      {
        _id: character._id,
        versions: {
          $elemMatch: { id: version.id, creditsCharged: true },
        },
      },
      {
        $set: {
          "versions.$.status": "failed",
          "versions.$.error": message,
          "versions.$.creditsCharged": false,
          updatedAt: new Date(),
        },
      },
    );
    if (claimed.modifiedCount === 1) {
      try {
        await refundCredits(character.clerkUserId, 1);
      } catch (refundError) {
        // Restore the claim so a later retry can refund again.
        await characters.updateOne(
          { _id: character._id, "versions.id": version.id },
          {
            $set: {
              "versions.$.creditsCharged": true,
              updatedAt: new Date(),
            },
          },
        );
        throw refundError;
      }
      return;
    }
    await characters.updateOne(
      { _id: character._id, "versions.id": version.id },
      {
        $set: {
          "versions.$.status": "failed",
          "versions.$.error": message,
          updatedAt: new Date(),
        },
      },
    );
  }
}

// Create a character and its first version (1 credit).
export async function createCharacterAction(
  formData: FormData,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const name = String(formData.get("name") || "").trim().slice(0, NAME_MAX);
    const styleId = String(formData.get("styleId") || "");
    const prompt = String(formData.get("prompt") || "").trim().slice(0, PROMPT_MAX);
    const referenceImageUrl =
      String(formData.get("referenceImageUrl") || "").trim() || undefined;

    if (!name) return { ok: false, error: "請輸入角色名稱" };
    if (!isStyleId(styleId)) return { ok: false, error: "請選擇風格" };
    if (!prompt && !referenceImageUrl) {
      return { ok: false, error: "請描述這個角色，或上傳一張參考圖" };
    }

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);

    const now = new Date();
    const version: CharacterVersion = {
      id: new ObjectId(),
      prompt,
      referenceImageUrl,
      status: "queued",
      creditsCharged: true,
      createdAt: now,
      submittedAt: now,
    };
    const characters = await charactersCollection();
    let character: Character;
    try {
      const insert = await characters.insertOne({
        userId: user._id,
        clerkUserId: user.clerkUserId,
        name,
        styleId,
        versions: [version],
        createdAt: now,
        updatedAt: now,
      });
      character = (await characters.findOne({ _id: insert.insertedId })) as Character;
    } catch (error) {
      // Refund if the DB write fails after charging. There is no version to
      // restore a flag on, so the credit is lost only if the refund fails too;
      // surface that error instead of the write error.
      try {
        await refundCredits(user.clerkUserId, 1);
      } catch (refundError) {
        throw refundError;
      }
      throw error;
    }

    const characterId = character._id.toHexString();
    after(async () => {
      await submitOrFail(character, version);
      revalidateCharacter(characterId);
    });
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "建立角色失敗");
  }
}

// Branch a new version off an existing one with a text edit (1 credit).
export async function editCharacterVersionAction(
  characterId: string,
  fromVersionId: string,
  editInstruction: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const instruction = editInstruction.trim().slice(0, PROMPT_MAX);
    if (!instruction) return { ok: false, error: "請輸入要修改的地方" };
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(fromVersionId)) return { ok: false, error: "版本不存在" };
    const parent = character.versions.find((item) =>
      item.id.equals(new ObjectId(fromVersionId)),
    );
    if (!parent) return { ok: false, error: "版本不存在" };
    if (parent.status !== "completed" || !parent.blueprintUrl) {
      return { ok: false, error: "只能從已完成的版本編輯" };
    }

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);

    const now = new Date();
    const version: CharacterVersion = {
      id: new ObjectId(),
      parentVersionId: parent.id,
      prompt: `${parent.prompt}\n變更：${instruction}`,
      editInstruction: instruction,
      referenceImageUrl: parent.blueprintUrl,
      status: "queued",
      creditsCharged: true,
      createdAt: now,
      submittedAt: now,
    };
    const characters = await charactersCollection();
    try {
      await characters.updateOne(
        { _id: character._id },
        { $push: { versions: version }, $set: { updatedAt: now } },
      );
    } catch (error) {
      // Refund if the DB write fails after charging. There is no version to
      // restore a flag on, so the credit is lost only if the refund fails too;
      // surface that error instead of the write error.
      try {
        await refundCredits(user.clerkUserId, 1);
      } catch (refundError) {
        throw refundError;
      }
      throw error;
    }

    after(async () => {
      await submitOrFail(character, version);
      revalidateCharacter(characterId);
    });
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "產生新版本失敗");
  }
}

// Re-run a failed version in place (1 credit).
export async function retryCharacterVersionAction(
  characterId: string,
  versionId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(versionId)) return { ok: false, error: "版本不存在" };
    const version = character.versions.find((item) =>
      item.id.equals(new ObjectId(versionId)),
    );
    if (!version) return { ok: false, error: "版本不存在" };
    if (version.status !== "failed") return { ok: false, error: "只有失敗的版本可以重試" };

    // Capture for nested helpers (TS narrowing doesn't flow into nested functions).
    const doc = character;
    const ver = version;

    const characters = await charactersCollection();
    const jobs = await generationJobsCollection();
    const claimed = await characters.updateOne(
      {
        _id: doc._id,
        versions: { $elemMatch: { id: ver.id, status: "failed" } },
      },
      {
        $set: {
          "versions.$.status": "queued",
          "versions.$.error": undefined,
          // Restart the stale-timeout clock for this attempt.
          "versions.$.submittedAt": new Date(),
          updatedAt: new Date(),
        },
      },
    );
    if (claimed.modifiedCount !== 1) {
      return { ok: false, error: "只有失敗的版本可以重試" };
    }

    async function revertClaim(extra?: { creditsCharged: false }) {
      await characters.updateOne(
        { _id: doc._id, "versions.id": ver.id },
        {
          $set: {
            "versions.$.status": "failed",
            updatedAt: new Date(),
            ...(extra ? { "versions.$.creditsCharged": false } : {}),
          },
        },
      );
    }

    // Remove stale jobs before charging so no old webhook can touch a freshly charged version.
    try {
      await jobs.deleteMany({ characterId: doc._id, versionId: ver.id });
    } catch (error) {
      await revertClaim();
      throw error;
    }

    try {
      await assertCanSpendCredits(user, 1);
      await consumeCredits(user.clerkUserId, 1);
    } catch (error) {
      await revertClaim();
      throw error;
    }

    try {
      await characters.updateOne(
        { _id: doc._id, "versions.id": ver.id },
        { $set: { "versions.$.creditsCharged": true, updatedAt: new Date() } },
      );
    } catch (error) {
      await revertClaim({ creditsCharged: false });
      try {
        await refundCredits(user.clerkUserId, 1);
      } catch (refundError) {
        await characters.updateOne(
          { _id: doc._id, "versions.id": ver.id },
          {
            $set: {
              "versions.$.creditsCharged": true,
              updatedAt: new Date(),
            },
          },
        );
        throw refundError;
      }
      throw error;
    }

    const retryVersion = { ...ver, status: "queued" as const, creditsCharged: true };
    after(async () => {
      await submitOrFail(doc, retryVersion);
      revalidateCharacter(characterId);
    });
    revalidateCharacter(characterId);
    return reload(doc._id);
  } catch (error) {
    return fail(error, "重試失敗");
  }
}

export async function setDefaultVersionAction(
  characterId: string,
  versionId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(versionId)) return { ok: false, error: "版本不存在" };
    const version = character.versions.find((item) =>
      item.id.equals(new ObjectId(versionId)),
    );
    if (!version) return { ok: false, error: "版本不存在" };
    if (!canSetDefault(version)) return { ok: false, error: "只有完成的版本可以設為預設" };

    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $set: { defaultVersionId: version.id, updatedAt: new Date() } },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "設定預設失敗");
  }
}

export async function renameCharacterAction(
  characterId: string,
  name: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const trimmed = name.trim().slice(0, NAME_MAX);
    if (!trimmed) return { ok: false, error: "請輸入角色名稱" };
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $set: { name: trimmed, updatedAt: new Date() } },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "重新命名失敗");
  }
}

// Lightweight read used by the workspace while jobs run in the background.
export async function getCharacterAction(
  characterId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    return { ok: true, character: toPublicCharacter(character) };
  } catch (error) {
    return fail(error, "讀取角色失敗");
  }
}

// Poll target while a version is generating: advance pending jobs, return fresh state.
export async function refreshCharacterAction(
  characterId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };

    const jobs = await generationJobsCollection();
    const pending = await jobs
      .find({
        characterId: character._id,
        status: { $in: ["queued", "in_progress"] },
      })
      .toArray();
    for (const job of pending) {
      if (!job.statusUrl) continue;
      try {
        const status = await fetchHiggsfieldStatus(job.statusUrl);
        await applyJobStatus({
          requestId: job.requestId,
          status: status.status,
          outputUrl: mediaUrlFromResponse(status),
        });
      } catch (error) {
        // Record the failure on the job but leave its status so the next poll retries.
        await jobs.updateOne(
          { _id: job._id },
          {
            $set: {
              error: error instanceof Error ? error.message : "status fetch failed",
              updatedAt: new Date(),
            },
          },
        );
      }
    }

    // Time out versions still in flight long past the expected duration.
    // Re-read: applyJobStatus above may have just finished some of them.
    const characters = await charactersCollection();
    const fresh = (await characters.findOne({ _id: character._id })) as Character | null;
    if (fresh) {
      const cutoff = new Date(Date.now() - STALE_AFTER_MS);
      for (const version of fresh.versions) {
        // In-memory fast path; the DB condition below is the real guard.
        if (version.status !== "queued" && version.status !== "in_progress") continue;
        const startedAt = version.submittedAt ?? version.createdAt;
        if (startedAt.getTime() > cutoff.getTime()) continue;
        // Claim only if the version is still in flight and still stale, so a
        // concurrent retry (new submittedAt + new charge) is never refunded.
        await failCharacterVersion(fresh._id, version.id, "藍圖產生逾時，credit 已退回", {
          onlyIf: {
            status: { $in: ["queued", "in_progress"] },
            submittedAt: { $lte: cutoff },
          },
          forceStatus: false,
        });
      }
    }
    return reload(character._id);
  } catch (error) {
    return fail(error, "更新進度失敗");
  }
}
