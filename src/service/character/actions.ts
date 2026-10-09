import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  getActiveSubscription,
  isSubscriptionActive,
  refundCredits,
} from "@/service/billing/credits";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";
import { enqueueCharacterVersion, isBoardVersion } from "@/service/character/generate";
import {
  characterStyleIds,
  originalCharacterSource,
  versionStyleId,
} from "@/service/character/character-styles";
import { characterAllowance } from "@/service/character/character-limit";
import { characterStyleAllowance } from "@/service/character/style-limit";
import { extractCharacterSpec } from "@/service/character/extract-spec";
import {
  editReferenceUrls,
  parseReferenceImageUrls,
  rootReferenceUrls,
} from "@/service/character/reference-urls";
import { collectCharacterBlobUrls } from "@/service/character/storage";
import { failCharacterVersion, versionCreditsCost } from "@/service/character/sync";
import { canSetDefault } from "@/service/character/versions";
import { charactersCollection, generationJobsCollection, usersCollection } from "@/dao";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
} from "@/service/higgsfield/generate";
import { applyJobStatus } from "@/service/higgsfield/pipeline";
import { toPublicCharacter, type PublicCharacter } from "@/presentation/serialize";
import { isListedStyleId } from "@/service/style/list-selectable";
import type { Character, CharacterVersion } from "@/model/character";
import { characterVoiceForStorage, parseCharacterVoice, type CharacterVoice } from "@/model/character-voice";
import { characterBlueprintVoiceInput, inferCharacterVoice } from "@/service/character/infer-voice";
import { VOICE_FILL_LIMIT, VOICE_FILL_WINDOW_MS } from "@/service/character/voice-fill-rate";

const NAME_MAX = 40;
const PROMPT_MAX = 1200;
// Blueprint sheets usually finish in 1–2 minutes; anything older is treated as lost.
const STALE_AFTER_MS = 15 * 60 * 1000;

export type CharacterResult =
  | { ok: true; character: PublicCharacter }
  | { ok: false; error: string };

export type DeleteCharacterResult = { ok: true } | { ok: false; error: string };

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

// Queue a charged version; if the queue write fails, mark it failed and refund now.
async function enqueueOrFail(character: Character, version: CharacterVersion) {
  try {
    await enqueueCharacterVersion(character, version);
  } catch (error) {
    const message = error instanceof Error ? error.message : "藍圖排程失敗";
    await failCharacterVersion(character._id, version.id, message);
    throw error;
  }
}

// Create a character and its first board version (BLUEPRINT_COST credits).
export async function createCharacterAction(
  formData: FormData,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const name = String(formData.get("name") || "").trim().slice(0, NAME_MAX);
    const styleId = String(formData.get("styleId") || "");
    const prompt = String(formData.get("prompt") || "").trim().slice(0, PROMPT_MAX);
    const referenceImageUrls = parseReferenceImageUrls(formData);
    const referenceImageUrl = referenceImageUrls[0];

    if (!name) return { ok: false, error: "請輸入角色名稱" };
    if (!isListedStyleId(styleId)) return { ok: false, error: "請選擇風格" };
    if (!prompt && !referenceImageUrl) {
      return { ok: false, error: "請描述這個角色，或上傳參考圖" };
    }
    const sub = await getActiveSubscription(user.clerkUserId);
    const allowance = characterAllowance(
      isSubscriptionActive(sub) && sub ? sub.planId : null,
      user.email,
    );
    if (allowance != null) {
      const existing = await charactersCollection();
      const count = await existing.countDocuments({ clerkUserId: user.clerkUserId });
      if (count >= allowance) return { ok: false, error: "已達這個方案的角色上限" };
    }
    const chosen = readCharacterVoice(formData.get("voice"));
    if (chosen === "invalid") return { ok: false, error: "聲線設定無效" };
    // No manual lock: infer one so the character is created with the lock on.
    // The appearance spec reads the same photos; both run before the charge.
    const [inferredVoice, spec] = await Promise.all([
      chosen ? Promise.resolve(chosen) : inferCharacterVoice({ name, description: prompt, referenceImageUrls }),
      extractCharacterSpec({ name, description: prompt, referenceImageUrls }),
    ]);
    const voice = characterVoiceForStorage(inferredVoice);

    await assertCanSpendCredits(user, BLUEPRINT_COST);
    const spendKey = await consumeCredits(user.clerkUserId, BLUEPRINT_COST);

    const now = new Date();
    const version: CharacterVersion = {
      id: new ObjectId(),
      styleId,
      prompt,
      referenceImageUrl,
      referenceImageUrls: referenceImageUrls.length ? referenceImageUrls : undefined,
      blueprintKind: "board",
      stage: "portrait",
      ...(spec ? { spec } : {}),
      status: "queued",
      creditsCharged: true,
      creditsCost: BLUEPRINT_COST,
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
        ...(voice ? { voice } : {}),
        versions: [version],
        createdAt: now,
        updatedAt: now,
      });
      character = (await characters.findOne({ _id: insert.insertedId })) as Character;
    } catch (error) {
      // Refund if the DB write fails after charging. There is no version to
      // restore a flag on, so the credits are lost only if the refund fails too;
      // surface that error instead of the write error.
      try {
        await refundCredits(user.clerkUserId, BLUEPRINT_COST, spendKey);
      } catch (refundError) {
        throw refundError;
      }
      throw error;
    }

    const characterId = character._id.toHexString();
    await enqueueOrFail(character, version);
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "建立角色失敗");
  }
}

// Branch a new version off an existing one with a text edit (FRAME_COST credits).
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
    // A sheet parent keeps the legacy single-image edit; a board parent edits both images.
    const board = isBoardVersion(parent);
    const cost = board ? BLUEPRINT_COST : versionCreditsCost(parent);

    await assertCanSpendCredits(user, cost);
    const spendKey = await consumeCredits(user.clerkUserId, cost);

    const now = new Date();
    // Board edits store only the root photos; the sender adds the parent images itself.
    const refs = board
      ? rootReferenceUrls(character.versions, parent)
      : editReferenceUrls(character.versions, parent);
    const version: CharacterVersion = {
      id: new ObjectId(),
      styleId: versionStyleId(character, parent),
      parentVersionId: parent.id,
      prompt: `${parent.prompt}\n變更：${instruction}`,
      editInstruction: instruction,
      referenceImageUrl: refs[0],
      referenceImageUrls: refs.length ? refs : undefined,
      ...(board
        ? {
            blueprintKind: "board" as const,
            stage: "portrait" as const,
            ...(parent.spec ? { spec: parent.spec } : {}),
          }
        : {}),
      status: "queued",
      creditsCharged: true,
      creditsCost: cost,
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
      // restore a flag on, so the credits are lost only if the refund fails too;
      // surface that error instead of the write error.
      try {
        await refundCredits(user.clerkUserId, cost, spendKey);
      } catch (refundError) {
        throw refundError;
      }
      throw error;
    }

    await enqueueOrFail(character, version);
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "產生新版本失敗");
  }
}

// New style on this character: a blueprint from the original photos, not from a later sheet.
export async function addCharacterStyleAction(
  characterId: string,
  styleId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    if (!isListedStyleId(styleId)) return { ok: false, error: "請選擇風格" };
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const styles = characterStyleIds(character);
    if (styles.includes(styleId)) return { ok: false, error: "這個角色已經有這個風格" };
    const sub = await getActiveSubscription(user.clerkUserId);
    const limit = characterStyleAllowance(
      isSubscriptionActive(sub) && sub ? sub.planId : null,
      user.email,
    );
    if (limit != null && styles.length >= limit) {
      return { ok: false, error: "已達這個方案的風格上限" };
    }

    const source = originalCharacterSource(character.versions);
    if (!source.prompt && source.referenceImageUrls.length === 0) {
      return { ok: false, error: "沒有可用的原始參考" };
    }
    // Reuse the spec an earlier board read from these same photos; otherwise read it now.
    const root = character.versions.find((version) => !version.parentVersionId) ?? character.versions[0];
    const spec =
      root?.spec ??
      (await extractCharacterSpec({
        name: character.name,
        description: source.prompt,
        referenceImageUrls: source.referenceImageUrls,
      }));

    await assertCanSpendCredits(user, BLUEPRINT_COST);
    const spendKey = await consumeCredits(user.clerkUserId, BLUEPRINT_COST);
    const now = new Date();
    const version: CharacterVersion = {
      id: new ObjectId(),
      styleId,
      prompt: source.prompt,
      referenceImageUrl: source.referenceImageUrls[0],
      referenceImageUrls: source.referenceImageUrls.length ? source.referenceImageUrls : undefined,
      blueprintKind: "board",
      stage: "portrait",
      ...(spec ? { spec } : {}),
      status: "queued",
      creditsCharged: true,
      creditsCost: BLUEPRINT_COST,
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
      try {
        await refundCredits(user.clerkUserId, BLUEPRINT_COST, spendKey);
      } catch (refundError) {
        throw refundError;
      }
      throw error;
    }

    await enqueueOrFail(character, version);
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "新增風格失敗");
  }
}

// Re-run a failed version in place (the same credits it was first charged).
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
    const cost = isBoardVersion(ver) ? BLUEPRINT_COST : versionCreditsCost(ver);

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
          "versions.$.creditsCost": cost,
          // Restart the stale-timeout clock for this attempt.
          "versions.$.submittedAt": new Date(),
          updatedAt: new Date(),
          // A board starts over from the portrait.
          ...(isBoardVersion(ver) ? { "versions.$.stage": "portrait" } : {}),
        },
        ...(isBoardVersion(ver)
          ? { $unset: { "versions.$.portraitUrl": "", "versions.$.profileUrl": "", "versions.$.blueprintUrl": "" } }
          : {}),
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

    let spendKey: string;
    try {
      await assertCanSpendCredits(user, cost);
      spendKey = await consumeCredits(user.clerkUserId, cost);
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
        await refundCredits(user.clerkUserId, cost, spendKey);
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

    const retryVersion: CharacterVersion = {
      ...ver,
      status: "queued",
      creditsCharged: true,
      creditsCost: cost,
      ...(isBoardVersion(ver)
        ? { stage: "portrait", portraitUrl: undefined, profileUrl: undefined, blueprintUrl: undefined }
        : {}),
    };
    await enqueueOrFail(doc, retryVersion);
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

    const styleId = versionStyleId(character, version);
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      {
        $set: {
          [`styleDefaults.${styleId}`]: version.id,
          // The character preview follows the original style only.
          ...(styleId === character.styleId ? { defaultVersionId: version.id } : {}),
          updatedAt: new Date(),
        },
      },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "設定預設失敗");
  }
}

// Claims one fill inside the 5-minute window. False when the user is already at the cap.
async function reserveVoiceFill(clerkUserId: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - VOICE_FILL_WINDOW_MS);
  const users = await usersCollection();
  const reserved = await users.updateOne(
    {
      clerkUserId,
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$voiceFillAt", []] },
                as: "stamp",
                cond: { $gt: ["$$stamp", since] },
              },
            },
          },
          VOICE_FILL_LIMIT,
        ],
      },
    },
    [
      {
        $set: {
          voiceFillAt: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ["$voiceFillAt", []] },
                  as: "stamp",
                  cond: { $gt: ["$$stamp", since] },
                },
              },
              [now],
            ],
          },
        },
      },
    ],
  );
  return reserved.matchedCount === 1;
}

// Reads the default blueprint, saves the lock, and counts toward the 5-per-5-minutes cap.
export async function suggestCharacterVoiceAction(characterId: string): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const source = characterBlueprintVoiceInput(character);
    if (!source) return { ok: false, error: "還沒有完成的藍圖" };
    const reserved = await reserveVoiceFill(user.clerkUserId, new Date());
    if (!reserved) return { ok: false, error: "聲線填寫太頻繁，請 5 分鐘後再試" };
    const voice = characterVoiceForStorage(await inferCharacterVoice(source));
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $set: { voice, updatedAt: new Date() } },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "聲線推斷失敗");
  }
}

// null clears the lock. A voice object replaces it. Blueprint versions stay as they are.
export async function saveCharacterVoiceAction(
  characterId: string,
  voice: CharacterVoice | null,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const parsed = voice === null ? null : parseCharacterVoice(voice);
    if (voice !== null && !parsed) {
      return { ok: false, error: "聲線設定無效" };
    }
    const stored = parsed ? characterVoiceForStorage(parsed) : null;
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      stored
        ? { $set: { voice: stored, updatedAt: new Date() } }
        : { $unset: { voice: "" }, $set: { updatedAt: new Date() } },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "儲存聲線失敗");
  }
}

function readCharacterVoice(value: FormDataEntryValue | null): CharacterVoice | null | "invalid" {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseCharacterVoice(parsed) ?? "invalid";
  } catch {
    return "invalid";
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

// Delete a character, its generation jobs, and every stored reference/blueprint.
export async function deleteCharacterAction(
  characterId: string,
): Promise<DeleteCharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };

    const blobUrls = collectCharacterBlobUrls(character);
    await deleteExplainerBlobUrls(blobUrls);

    const jobs = await generationJobsCollection();
    await jobs.deleteMany({ characterId: character._id });

    const characters = await charactersCollection();
    const removed = await characters.deleteOne({
      _id: character._id,
      clerkUserId: user.clerkUserId,
    });
    if (removed.deletedCount !== 1) {
      return { ok: false, error: "角色不存在" };
    }

    revalidateCharacter(characterId);
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除角色失敗",
    };
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
      const { statusUrl, requestId } = job;
      if (!statusUrl || !requestId) continue;
      try {
        const status = await fetchHiggsfieldStatus(statusUrl);
        await applyJobStatus({
          requestId,
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
