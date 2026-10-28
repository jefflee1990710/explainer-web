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
import { characterAllowance, countedCharacterFilter } from "@/service/character/character-limit";
import { parseCharacterPersona, type CharacterPersona } from "@/model/character-persona";
import { characterStyleAllowance, isCharacterStyleLimitUnlocked } from "@/service/character/style-limit";
import { extractCharacterSpec } from "@/service/character/extract-spec";
import {
  editReferenceUrls,
  parseReferenceImageUrls,
  rootReferenceUrls,
  rootVersionOf,
} from "@/service/character/reference-urls";
import {
  blobUrlsSafeToDelete,
  collectCharacterBlobUrls,
  collectCharactersBlobUrls,
  parseValidCharacterObjectIds,
  videoCharacterBlobUrls,
} from "@/service/character/storage";
import { failCharacterVersion, versionCreditsCost } from "@/service/character/sync";
import { cumulativeWardrobeEdit, specAfterWardrobeEdit } from "@/service/character/wardrobe-edit";
import { canSetDefault } from "@/service/character/versions";
import {
  charactersCollection,
  generationJobsCollection,
  lifeShotsCollection,
  usersCollection,
  videosCollection,
} from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  isVoiceSampleLanguage,
  isVoiceSampleMime,
  normalizeVoiceSampleClips,
  VOICE_SAMPLE_MAX_BYTES,
  VOICE_SAMPLE_MAX_FILES,
  VOICE_SAMPLE_MAX_SECONDS,
  VOICE_SAMPLE_MIN_SECONDS,
  voiceSampleUrls,
  type CharacterVoiceSampleClip,
  type VoiceSampleLanguage,
} from "@/model/character-voice-sample";
import {
  createVoiceClone,
  deleteVoiceClone,
  isElevenLabsConfigured,
  type VoiceCloneFileInput,
} from "@/service/voice/elevenlabs";
import { probeAudioSeconds } from "@/service/voice/voice-swap";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
} from "@/service/higgsfield/generate";
import { applyJobStatus } from "@/service/higgsfield/pipeline";
import { toPublicCharacter, type PublicCharacter, type PublicStyle } from "@/presentation/serialize";
import { isListedStyleId } from "@/service/style/list-selectable";
import { listSelectableStyles } from "@/service/style/list";
import type { PlanId } from "@/model/subscription";
import type { Character, CharacterVersion, CharacterVoiceMode } from "@/model/character";
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
      const count = await existing.countDocuments(countedCharacterFilter(user.clerkUserId));
      if (count >= allowance) return { ok: false, error: "已達這個方案的角色上限" };
    }
    const chosen = readCharacterVoice(formData.get("voice"));
    if (chosen === "invalid") return { ok: false, error: "聲線設定無效" };
    const persona = readPersona(formData.get("persona"));
    if (persona === "invalid") return { ok: false, error: "人設設定無效" };
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
        ...(persona ? { persona } : {}),
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
    const newVersionId = new ObjectId();
    // Board edits store only the root photos; the sender adds the root board images itself.
    const refs = board
      ? rootReferenceUrls(character.versions, parent)
      : editReferenceUrls(character.versions, parent);
    const root = rootVersionOf(character.versions, parent);
    const baseSpec = root.spec ?? parent.spec;
    const cumulativeEdit =
      cumulativeWardrobeEdit(character.versions, {
        id: newVersionId,
        parentVersionId: parent.id,
        editInstruction: instruction,
      }) || instruction;
    const version: CharacterVersion = {
      id: newVersionId,
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
            ...(baseSpec ? { spec: specAfterWardrobeEdit(baseSpec, cumulativeEdit) } : {}),
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

const PRESET_NAME_MAX = 60;

// Save a named preset pointing to a completed blueprint version.
export async function saveCharacterPresetAction(
  characterId: string,
  versionId: string,
  name: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const trimmed = name.trim().slice(0, PRESET_NAME_MAX);
    if (!trimmed) return { ok: false, error: "請輸入 Preset 名稱" };
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(versionId)) return { ok: false, error: "版本不存在" };
    const version = character.versions.find((item) =>
      item.id.equals(new ObjectId(versionId)),
    );
    if (!version) return { ok: false, error: "版本不存在" };
    if (!canSetDefault(version)) {
      return { ok: false, error: "只有已完成的藍圖版本可以儲存為 Preset" };
    }

    const now = new Date();
    const styleId = versionStyleId(character, version);
    const preset = {
      id: new ObjectId(),
      name: trimmed,
      versionId: version.id,
      styleId,
      createdAt: now,
    };
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      {
        $push: { presets: preset },
        $set: { updatedAt: now },
      },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "儲存 Preset 失敗");
  }
}

// Delete a saved preset record from a character (keeps the underlying version intact).
export async function deleteCharacterPresetAction(
  characterId: string,
  presetId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(presetId)) return { ok: false, error: "Preset 不存在" };

    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      {
        $pull: { presets: { id: new ObjectId(presetId) } },
        $set: { updatedAt: new Date() },
      },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "刪除 Preset 失敗");
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
      { $set: { voice, voiceMode: "lock", updatedAt: new Date() } },
    );
    const videos = await videosCollection();
    await videos.updateMany(
      { "cast.characterId": character._id },
      {
        $unset: {
          "cast.$[member].voiceSample": "",
          "cast.$[member].voiceSamples": "",
        },
        $set: {
          "cast.$[member].voice": voice,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "member.characterId": character._id }] },
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
        ? { $set: { voice: stored, voiceMode: "lock", updatedAt: new Date() } }
        : { $unset: { voice: "" }, $set: { updatedAt: new Date() } },
    );
    if (stored) {
      const videos = await videosCollection();
      await videos.updateMany(
        { "cast.characterId": character._id },
        {
          $unset: {
            "cast.$[member].voiceSample": "",
            "cast.$[member].voiceSamples": "",
          },
          $set: {
            "cast.$[member].voice": stored,
            updatedAt: new Date(),
          },
        },
        { arrayFilters: [{ "member.characterId": character._id }] },
      );
    }
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "儲存聲線失敗");
  }
}

// Switches a character's active voice source between Voice lock ("lock") and Demo voice ("sample").
export async function setCharacterVoiceModeAction(
  characterId: string,
  voiceMode: CharacterVoiceMode,
): Promise<CharacterResult> {
  try {
    if (voiceMode !== "lock" && voiceMode !== "sample") {
      return { ok: false, error: "聲線設定無效" };
    }
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };

    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $set: { voiceMode, updatedAt: new Date() } },
    );

    const videos = await videosCollection();
    if (voiceMode === "lock") {
      await videos.updateMany(
        { "cast.characterId": character._id },
        {
          $unset: {
            "cast.$[member].voiceSample": "",
            "cast.$[member].voiceSamples": "",
          },
          $set: { updatedAt: new Date() },
        },
        { arrayFilters: [{ "member.characterId": character._id }] },
      );
    } else {
      const setFields: Record<string, unknown> = { updatedAt: new Date() };
      if (character.voiceSample?.url && character.voiceSample?.elevenVoiceId) {
        setFields["cast.$[member].voiceSample"] = {
          url: character.voiceSample.url,
          elevenVoiceId: character.voiceSample.elevenVoiceId,
        };
      }
      if (character.voiceSamples) {
        for (const [lang, s] of Object.entries(character.voiceSamples)) {
          if (s?.url && s?.elevenVoiceId) {
            setFields[`cast.$[member].voiceSamples.${lang}`] = {
              url: s.url,
              elevenVoiceId: s.elevenVoiceId,
            };
          }
        }
      }
      await videos.updateMany(
        { "cast.characterId": character._id },
        { $set: setFields },
        { arrayFilters: [{ "member.characterId": character._id }] },
      );
    }

    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "儲存聲線失敗");
  }
}

// Stores one or more demo voice files on Blob and clones them together on ElevenLabs.
export async function uploadCharacterVoiceSampleAction(
  characterId: string,
  formData: FormData,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };

    const rawEntries = [
      ...formData.getAll("files"),
      ...(formData.getAll("files").length === 0 ? formData.getAll("file") : []),
    ];
    const pickedFiles = rawEntries.filter(
      (entry): entry is File => entry instanceof File && entry.size > 0,
    );
    if (pickedFiles.length === 0) return { ok: false, error: "請選擇聲音檔" };
    if (!isElevenLabsConfigured()) return { ok: false, error: "尚未設定 ELEVENLABS_API_KEY" };

    const rawLang = formData.get("language");
    const language: VoiceSampleLanguage = isVoiceSampleLanguage(rawLang) ? rawLang : "yue";
    const mode = formData.get("mode") === "append" ? "append" : "replace";
    const currentLangSample =
      character.voiceSamples?.[language] ??
      ((character.voiceSample?.language ?? "yue") === language
        ? character.voiceSample
        : undefined);
    const existingClips =
      mode === "append" ? normalizeVoiceSampleClips(currentLangSample) : [];
    if (existingClips.length + pickedFiles.length > VOICE_SAMPLE_MAX_FILES) {
      return { ok: false, error: "聲音檔不可超過 10MB" };
    }

    const preparedNew: Array<{
      file: File;
      buffer: Buffer;
      ext: string;
      seconds: number;
    }> = [];

    for (const file of pickedFiles) {
      if (!isVoiceSampleMime(file.type)) {
        return { ok: false, error: "只支援 MP3、WAV、M4A 聲音檔" };
      }
      if (file.size > VOICE_SAMPLE_MAX_BYTES) {
        return { ok: false, error: "聲音檔不可超過 10MB" };
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "");
      const seconds = await probeAudioSeconds(buffer, ext || "mp3");
      if (seconds === null) return { ok: false, error: "無法讀取聲音檔" };
      preparedNew.push({ file, buffer, ext: ext || "mp3", seconds });
    }

    const existingTotalSeconds = existingClips.reduce(
      (sum, item) => sum + item.durationSeconds,
      0,
    );
    const newTotalSeconds = preparedNew.reduce((sum, item) => sum + item.seconds, 0);
    const totalSeconds = existingTotalSeconds + newTotalSeconds;
    if (totalSeconds < VOICE_SAMPLE_MIN_SECONDS || totalSeconds > VOICE_SAMPLE_MAX_SECONDS) {
      return { ok: false, error: "示範聲音需為 5–120 秒" };
    }

    const existingCloneInputs: VoiceCloneFileInput[] = [];
    for (let index = 0; index < existingClips.length; index++) {
      const clip = existingClips[index];
      const response = await fetch(clip.url);
      if (response.ok) {
        const bytes = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") || "audio/mpeg";
        existingCloneInputs.push({
          file: new Blob([bytes], { type: contentType }),
          filename: clip.name || `existing-${index + 1}.mp3`,
        });
      }
    }

    const cloneFiles: VoiceCloneFileInput[] = [
      ...existingCloneInputs,
      ...preparedNew.map((item, idx) => ({
        file: item.file,
        filename: item.file.name || `sample-${idx + 1}.${item.ext}`,
      })),
    ];

    const elevenVoiceId = await createVoiceClone({
      name: `${character.name} [${language}] (${character._id.toHexString()})`,
      files: cloneFiles,
      language,
      gender: character.voice?.gender,
    });

    const nowMs = Date.now();
    const uploadedNewClips: CharacterVoiceSampleClip[] = [];
    for (let index = 0; index < preparedNew.length; index++) {
      const item = preparedNew[index];
      const url = await persistBuffer(
        item.buffer,
        `explainer/characters/${character._id.toHexString()}/voice-${language}-${nowMs}-${index + 1}.${item.ext}`,
        item.file.type,
      );
      uploadedNewClips.push({
        url,
        durationSeconds: item.seconds,
        name: item.file.name || `sample-${index + 1}.${item.ext}`,
      });
    }

    const allClips = [...existingClips, ...uploadedNewClips];
    const allUrls = allClips.map((clip) => clip.url);
    const primaryUrl = allUrls[0];
    const newSampleDoc = {
      url: primaryUrl,
      urls: allUrls,
      clips: allClips,
      durationSeconds: totalSeconds,
      elevenVoiceId,
      language,
      uploadedAt: new Date(),
    };

    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      {
        $set: {
          voiceMode: "sample",
          voiceSample: newSampleDoc,
          [`voiceSamples.${language}`]: newSampleDoc,
          updatedAt: new Date(),
        },
      },
    );
    const videos = await videosCollection();
    await videos.updateMany(
      { "cast.characterId": character._id },
      {
        $set: {
          "cast.$[member].voiceSample": { url: primaryUrl, elevenVoiceId },
          [`cast.$[member].voiceSamples.${language}`]: { url: primaryUrl, elevenVoiceId },
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "member.characterId": character._id }] },
    );
    if (currentLangSample) {
      await dropVoiceSample(currentLangSample, allUrls);
    }
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "上傳示範聲音失敗");
  }
}

export async function removeCharacterVoiceSampleAction(
  characterId: string,
  clipUrl?: string,
  language: VoiceSampleLanguage = "yue",
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const currentLangSample =
      character.voiceSamples?.[language] ??
      ((character.voiceSample?.language ?? "yue") === language
        ? character.voiceSample
        : undefined);
    const existingClips = normalizeVoiceSampleClips(currentLangSample);
    const remainingClips = clipUrl
      ? existingClips.filter((clip) => clip.url !== clipUrl)
      : [];

    const characters = await charactersCollection();
    const videos = await videosCollection();

    if (remainingClips.length > 0 && currentLangSample) {
      const cloneInputs: VoiceCloneFileInput[] = [];
      for (let index = 0; index < remainingClips.length; index++) {
        const clip = remainingClips[index];
        const response = await fetch(clip.url);
        if (response.ok) {
          const bytes = await response.arrayBuffer();
          const contentType = response.headers.get("content-type") || "audio/mpeg";
          cloneInputs.push({
            file: new Blob([bytes], { type: contentType }),
            filename: clip.name || `sample-${index + 1}.mp3`,
          });
        }
      }
      if (cloneInputs.length > 0) {
        const elevenVoiceId = await createVoiceClone({
          name: `${character.name} [${language}] (${character._id.toHexString()})`,
          files: cloneInputs,
          language,
          gender: character.voice?.gender,
        });
        const remainingUrls = remainingClips.map((clip) => clip.url);
        const primaryUrl = remainingUrls[0];
        const totalSeconds = remainingClips.reduce(
          (sum, clip) => sum + clip.durationSeconds,
          0,
        );
        const updatedSampleDoc = {
          url: primaryUrl,
          urls: remainingUrls,
          clips: remainingClips,
          durationSeconds: totalSeconds,
          elevenVoiceId,
          language,
          uploadedAt: new Date(),
        };
        await characters.updateOne(
          { _id: character._id },
          {
            $set: {
              voiceSample: updatedSampleDoc,
              [`voiceSamples.${language}`]: updatedSampleDoc,
              updatedAt: new Date(),
            },
          },
        );
        await videos.updateMany(
          { "cast.characterId": character._id },
          {
            $set: {
              "cast.$[member].voiceSample": { url: primaryUrl, elevenVoiceId },
              [`cast.$[member].voiceSamples.${language}`]: { url: primaryUrl, elevenVoiceId },
              updatedAt: new Date(),
            },
          },
          { arrayFilters: [{ "member.characterId": character._id }] },
        );
        await dropVoiceSample(currentLangSample, remainingUrls);
        revalidateCharacter(characterId);
        return reload(character._id);
      }
    }

    const otherLangs = (["yue", "zh", "en"] as const).filter((l) => l !== language);
    const fallbackSample = otherLangs
      .map((l) => character.voiceSamples?.[l])
      .find((s) => Boolean(s?.url && s?.elevenVoiceId));

    if (fallbackSample) {
      await characters.updateOne(
        { _id: character._id },
        {
          $unset: { [`voiceSamples.${language}`]: "" },
          $set: { voiceSample: fallbackSample, updatedAt: new Date() },
        },
      );
      await videos.updateMany(
        { "cast.characterId": character._id },
        {
          $unset: { [`cast.$[member].voiceSamples.${language}`]: "" },
          $set: {
            "cast.$[member].voiceSample": {
              url: fallbackSample.url,
              elevenVoiceId: fallbackSample.elevenVoiceId,
            },
            updatedAt: new Date(),
          },
        },
        { arrayFilters: [{ "member.characterId": character._id }] },
      );
    } else {
      await characters.updateOne(
        { _id: character._id },
        {
          $unset: { voiceSample: "", [`voiceSamples.${language}`]: "" },
          $set: { voiceMode: "lock", updatedAt: new Date() },
        },
      );
      await videos.updateMany(
        { "cast.characterId": character._id },
        {
          $unset: {
            "cast.$[member].voiceSample": "",
            [`cast.$[member].voiceSamples.${language}`]: "",
          },
          $set: { updatedAt: new Date() },
        },
        { arrayFilters: [{ "member.characterId": character._id }] },
      );
    }
    if (currentLangSample) await dropVoiceSample(currentLangSample);
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "移除示範聲音失敗");
  }
}

// Unused files go; the old clone is deleted once no video cast references it.
async function dropVoiceSample(
  sample: NonNullable<Character["voiceSample"]>,
  keepUrls: string[] = [],
) {
  const keepSet = new Set(keepUrls);
  const toDelete = voiceSampleUrls(sample).filter((url) => !keepSet.has(url));
  if (toDelete.length > 0) await deleteExplainerBlobUrls(toDelete);
  const videos = await videosCollection();
  const inUse = await videos.countDocuments({
    "cast.voiceSample.elevenVoiceId": sample.elevenVoiceId,
  });
  if (inUse === 0) await deleteVoiceClone(sample.elevenVoiceId);
}

function readPersona(value: FormDataEntryValue | null): CharacterPersona | null | "invalid" {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseCharacterPersona(parsed) ?? "invalid";
  } catch {
    return "invalid";
  }
}

export async function saveCharacterPersonaAction(
  characterId: string,
  persona: CharacterPersona | null,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const parsed = persona === null ? null : parseCharacterPersona(persona);
    if (persona !== null && !parsed) return { ok: false, error: "人設設定無效" };
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      parsed
        ? { $set: { persona: parsed, updatedAt: new Date() } }
        : { $unset: { persona: "" }, $set: { updatedAt: new Date() } },
    );
    revalidateCharacter(characterId);
    revalidatePath("/app/life");
    return reload(character._id);
  } catch (error) {
    return fail(error, "儲存人設失敗");
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

// Keep blueprint and voice files a video still references. The rest can go.
async function deleteUnusedCharacterBlobs(urls: string[]) {
  const unique = [...new Set(urls)];
  if (unique.length === 0) return;
  const videos = await videosCollection();
  const docs = await videos
    .find(
      {
        $or: [
          { "cast.blueprintUrl": { $in: unique } },
          { "cast.voiceSample.url": { $in: unique } },
          { characterImageUrl: { $in: unique } },
          { characterStillUrl: { $in: unique } },
        ],
      },
      { projection: { cast: 1, characterImageUrl: 1, characterStillUrl: 1 } },
    )
    .toArray();
  const referenced = docs.flatMap((video) => videoCharacterBlobUrls(video));
  await deleteExplainerBlobUrls(blobUrlsSafeToDelete(unique, referenced));
}

// Delete a character, its generation jobs, and stored files no video still uses.
export async function deleteCharacterAction(
  characterId: string,
): Promise<DeleteCharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };

    await deleteUnusedCharacterBlobs(collectCharacterBlobUrls(character));

    const jobs = await generationJobsCollection();
    await jobs.deleteMany({ characterId: character._id });
    const lifeShots = await lifeShotsCollection();
    await lifeShots.deleteMany({ characterId: character._id, clerkUserId: user.clerkUserId });

    const characters = await charactersCollection();
    const removed = await characters.deleteOne({
      _id: character._id,
      clerkUserId: user.clerkUserId,
    });
    if (removed.deletedCount !== 1) {
      return { ok: false, error: "角色不存在" };
    }
    if (character.voiceSample) await dropVoiceSample(character.voiceSample);

    revalidateCharacter(characterId);
    revalidatePath("/app/life");
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除角色失敗",
    };
  }
}

// Bulk-delete owned characters, their generation jobs, voice samples, and stored blobs.
export async function deleteCharactersAction(
  characterIds: string[],
): Promise<DeleteCharacterResult> {
  try {
    const user = await requireAppUser();
    const validIds = parseValidCharacterObjectIds(characterIds);
    if (validIds.length === 0) return { ok: false, error: "角色不存在" };

    const characters = await charactersCollection();
    const owned = (await characters
      .find({ _id: { $in: validIds }, clerkUserId: user.clerkUserId })
      .toArray()) as Character[];
    if (owned.length === 0) return { ok: false, error: "角色不存在" };

    const ownedObjectIds = owned.map((doc) => doc._id);
    await deleteUnusedCharacterBlobs(collectCharactersBlobUrls(owned));

    const jobs = await generationJobsCollection();
    await jobs.deleteMany({ characterId: { $in: ownedObjectIds } });
    const lifeShots = await lifeShotsCollection();
    await lifeShots.deleteMany({ characterId: { $in: ownedObjectIds }, clerkUserId: user.clerkUserId });

    await characters.deleteMany({
      _id: { $in: ownedObjectIds },
      clerkUserId: user.clerkUserId,
    });

    for (const doc of owned) {
      if (doc.voiceSample) await dropVoiceSample(doc.voiceSample);
      revalidatePath(`/app/characters/${doc._id.toHexString()}`);
    }
    revalidatePath("/app/characters");
    revalidatePath("/app/life");
    revalidatePath("/app/billing");
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除角色失敗",
    };
  }
}

export type CharacterWorkspaceLoad =
  | {
      ok: true;
      character: PublicCharacter;
      credits: number;
      subscribed: boolean;
      planId: PlanId | null;
      unlimitedStyles: boolean;
      styles: PublicStyle[];
    }
  | { ok: false; error: string };

// Everything the character page paints. The route itself stays empty so the URL
// changes immediately and this load fills the page.
export async function loadCharacterWorkspaceAction(
  characterId: string,
): Promise<CharacterWorkspaceLoad> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const [sub, selectable] = await Promise.all([
      getActiveSubscription(user.clerkUserId),
      listSelectableStyles(user.clerkUserId),
    ]);
    const subscribed = isSubscriptionActive(sub);
    return {
      ok: true,
      character: toPublicCharacter(character),
      credits: user.credits,
      subscribed,
      planId: subscribed && sub ? sub.planId : null,
      unlimitedStyles: isCharacterStyleLimitUnlocked(user.email),
      styles: [...selectable.system, ...selectable.mine],
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "讀取角色失敗" };
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
