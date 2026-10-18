import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { charactersCollection } from "@/dao/characters";
import { lifeShotsCollection } from "@/dao/life-shots";
import type { Character } from "@/model/character";
import { parseCharacterPersona, type CharacterPersona } from "@/model/character-persona";
import {
  lifeShotKindSchema,
  lifeShotSourceSchema,
  type LifeShot,
  type LifeShotKind,
  type LifeShotSource,
} from "@/model/life-shot";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { characterIdentityUrl } from "@/service/character/identity";
import { lifeSceneQuery, lifeShotPrompt } from "@/service/character/life-prompt";
import { searchPlaceScenes } from "@/service/character/life-search";
import { FRAME_COST } from "@/service/credit-costs";
import { persistMedia } from "@/service/higgsfield/persist";
import { SEEDREAM_5_PRO_IMAGE_MODEL } from "@/service/generation/image-backend";
import { submitOpenRouterImage } from "@/service/openrouter/generate";

export type PublicLifeCharacter = {
  id: string;
  name: string;
  previewUrl: string | null;
  persona: CharacterPersona | null;
  ready: boolean;
};

export type PublicLifeShot = {
  id: string;
  characterId: string;
  characterName: string;
  place: string;
  kind: LifeShotKind;
  source: LifeShotSource;
  sceneImageUrl: string;
  resultUrl: string;
  createdAt: string;
};

function toPublicShot(shot: LifeShot): PublicLifeShot {
  return {
    id: shot._id.toHexString(),
    characterId: shot.characterId.toHexString(),
    characterName: shot.characterName,
    place: shot.place,
    kind: shot.kind,
    source: shot.source,
    sceneImageUrl: shot.sceneImageUrl,
    resultUrl: shot.resultUrl,
    createdAt: shot.createdAt.toISOString(),
  };
}

export async function listLifePage(clerkUserId: string) {
  const characters = await charactersCollection();
  const shots = await lifeShotsCollection();
  const [docs, recent] = await Promise.all([
    characters.find({ clerkUserId }).sort({ updatedAt: -1 }).toArray() as Promise<Character[]>,
    shots.find({ clerkUserId }).sort({ createdAt: -1 }).limit(24).toArray() as Promise<LifeShot[]>,
  ]);
  const people: PublicLifeCharacter[] = docs.map((character) => {
    const identity = characterIdentityUrl(character);
    return {
      id: character._id.toHexString(),
      name: character.name,
      previewUrl: identity,
      persona: parseCharacterPersona(character.persona),
      ready: Boolean(identity),
    };
  });
  return { characters: people, shots: recent.map(toPublicShot) };
}

export async function searchLifeScenesAction(input: {
  place: string;
  kind: LifeShotKind;
  interest?: string;
}) {
  try {
    await requireAppUser();
    const place = input.place.trim().slice(0, 40);
    const kind = lifeShotKindSchema.safeParse(input.kind);
    if (!place) return { ok: false as const, error: "請輸入地點" };
    if (!kind.success) return { ok: false as const, error: "請選擇生活照類型" };
    const hits = await searchPlaceScenes(lifeSceneQuery({ place, kind: kind.data, interest: input.interest }));
    if (!hits.length) return { ok: false as const, error: "找不到這個地方的照片" };
    return { ok: true as const, hits };
  } catch (error) {
    const message = error instanceof Error ? error.message : "搜尋地點照片失敗";
    return { ok: false as const, error: message };
  }
}

function httpsUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://") || trimmed.length > 2000) return "";
  return trimmed;
}

// One charged still. The character portrait locks the face; the scene photo is only the place.
export async function generateLifeShotAction(input: {
  characterId: string;
  place: string;
  kind: LifeShotKind;
  sceneImageUrl: string;
  source: LifeShotSource;
}) {
  const user = await requireAppUser();
  const place = input.place.trim().slice(0, 40);
  const kind = lifeShotKindSchema.safeParse(input.kind);
  const source = lifeShotSourceSchema.safeParse(input.source);
  const sceneImageUrl = httpsUrl(input.sceneImageUrl);
  if (!ObjectId.isValid(input.characterId)) return { ok: false as const, error: "角色不存在" };
  if (!place) return { ok: false as const, error: "請輸入地點" };
  if (!kind.success) return { ok: false as const, error: "請選擇生活照類型" };
  if (!source.success) return { ok: false as const, error: "請選擇場景照片" };
  if (!sceneImageUrl) return { ok: false as const, error: "請選擇場景照片" };

  const characters = await charactersCollection();
  const character = (await characters.findOne({
    _id: new ObjectId(input.characterId),
    clerkUserId: user.clerkUserId,
  })) as Character | null;
  if (!character) return { ok: false as const, error: "角色不存在" };
  const identity = characterIdentityUrl(character);
  if (!identity) return { ok: false as const, error: "還沒有完成的藍圖" };
  const persona = parseCharacterPersona(character.persona);

  await assertCanSpendCredits(user, FRAME_COST);
  const spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
  try {
    const submitted = await submitOpenRouterImage({
      model: SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: lifeShotPrompt({
        name: character.name,
        kind: kind.data,
        place,
        interests: persona?.interests ?? [],
      }),
      aspectRatio: "9:16",
      resolution: "2k",
      referenceImageUrls: [identity, sceneImageUrl],
    });
    const imageUrl = submitted.images?.[0]?.url;
    if (!imageUrl) throw new Error("生活照生成失敗");
    const shotId = new ObjectId();
    const resultUrl = await persistMedia(
      imageUrl,
      `explainer/life/${character._id.toHexString()}/${shotId.toHexString()}`,
    );
    const shot: LifeShot = {
      _id: shotId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      characterId: character._id,
      characterName: character.name,
      place,
      kind: kind.data,
      source: source.data,
      sceneImageUrl,
      resultUrl,
      createdAt: new Date(),
    };
    const shots = await lifeShotsCollection();
    await shots.insertOne(shot);
    revalidatePath("/app/life");
    revalidatePath("/app/billing");
    return { ok: true as const, shot: toPublicShot(shot) };
  } catch (error) {
    try {
      await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
    } catch {
      // The generate error is the one the user can act on.
    }
    const message = error instanceof Error ? error.message : "生活照生成失敗";
    return { ok: false as const, error: message };
  }
}
