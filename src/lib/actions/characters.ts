"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/lib/billing/credits";
import { submitCharacterVersion } from "@/lib/characters/generate";
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
    await characters.updateOne(
      { _id: character._id, "versions.id": version.id },
      {
        $set: {
          "versions.$.status": "failed",
          "versions.$.error": error instanceof Error ? error.message : "藍圖送出失敗",
          "versions.$.creditsCharged": false,
          updatedAt: new Date(),
        },
      },
    );
    await refundCredits(character.clerkUserId, 1);
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
    if (!prompt) return { ok: false, error: "請描述這個角色" };

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
    };
    const characters = await charactersCollection();
    const insert = await characters.insertOne({
      userId: user._id,
      clerkUserId: user.clerkUserId,
      name,
      styleId,
      versions: [version],
      createdAt: now,
      updatedAt: now,
    });
    const character = (await characters.findOne({ _id: insert.insertedId })) as Character;

    await submitOrFail(character, version);
    revalidateCharacter(character._id.toHexString());
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
    };
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $push: { versions: version }, $set: { updatedAt: now } },
    );

    await submitOrFail(character, version);
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

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);

    const characters = await charactersCollection();
    const jobs = await generationJobsCollection();
    await jobs.deleteMany({ characterId: character._id, versionId: version.id });
    await characters.updateOne(
      { _id: character._id, "versions.id": version.id },
      {
        $set: {
          "versions.$.status": "queued",
          "versions.$.error": undefined,
          "versions.$.creditsCharged": true,
          updatedAt: new Date(),
        },
      },
    );

    await submitOrFail(character, { ...version, status: "queued", creditsCharged: true });
    revalidateCharacter(characterId);
    return reload(character._id);
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
      } catch {
        // Transient status failure; the next poll retries.
      }
    }
    return reload(character._id);
  } catch (error) {
    return fail(error, "更新進度失敗");
  }
}

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
