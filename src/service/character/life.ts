import { generateText } from "ai";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { charactersCollection } from "@/dao/characters";
import { lifeShotsCollection } from "@/dao/life-shots";
import type { Character } from "@/model/character";
import { parseCharacterPersona, type CharacterPersona } from "@/model/character-persona";
import { lifePoseById } from "@/model/life-pose";
import { lifePostTemplateById } from "@/model/life-post-template";
import {
  lifeShotKindSchema,
  lifeShotSourceSchema,
  type LifeShot,
  type LifeShotKind,
  type LifeShotSource,
} from "@/model/life-shot";
import type { LifeCreateMode } from "@/model/life-shot-kind";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { characterIdentityUrl } from "@/service/character/identity";
import { resolveDefaultVersion } from "@/service/character/versions";
import {
  lifeSceneQuery,
  lifeShotPrompt,
  type LifeRemarkInput,
} from "@/service/character/life-prompt";
import { lifePoseReferenceUrl } from "@/service/character/life-pose-ref";
import { searchPlaceScenes } from "@/service/character/life-search";
import { FRAME_COST } from "@/service/credit-costs";
import { directorModel } from "@/service/director/model";
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
  templateId: string | null;
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
    templateId: shot.templateId ?? null,
    createdAt: shot.createdAt.toISOString(),
  };
}

export async function listLifePage(clerkUserId: string) {
  const characters = await charactersCollection();
  const shots = await lifeShotsCollection();
  const [docs, recent] = await Promise.all([
    characters.find({ clerkUserId }).sort({ updatedAt: -1 }).toArray() as Promise<Character[]>,
    shots.find({ clerkUserId }).sort({ createdAt: -1 }).limit(120).toArray() as Promise<LifeShot[]>,
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

// One charged still. The character portrait locks the face; the scene photo is the base image (optional in post-template mode).
export async function generateLifeShotAction(input: {
  characterId: string;
  createMode?: LifeCreateMode;
  place?: string;
  kind?: LifeShotKind;
  sceneImageUrl?: string;
  source: LifeShotSource;
  customInstruction?: string;
  annotatedSceneDataUrl?: string;
  remarks?: LifeRemarkInput[];
  templateId?: string;
  compositionRefUrl?: string;
  poseId?: string;
}) {
  const user = await requireAppUser();
  const place = (input.place ?? "").trim().slice(0, 60);
  const template = lifePostTemplateById(input.templateId);
  const pose = lifePoseById(input.poseId);
  const kindParsed = lifeShotKindSchema.safeParse(template?.kind || input.kind || "selfie");
  const source = lifeShotSourceSchema.safeParse(input.source);
  const sceneImageUrl = httpsUrl(input.sceneImageUrl ?? "");
  const compositionRefUrl = httpsUrl(input.compositionRefUrl ?? "");
  if (!ObjectId.isValid(input.characterId)) return { ok: false as const, error: "角色不存在" };
  if (!kindParsed.success) return { ok: false as const, error: "請選擇生活照類型" };
  if (!source.success) return { ok: false as const, error: "請選擇場景照片" };
  if (input.createMode === "post-template") {
    if (!template) return { ok: false as const, error: "請選擇貼文類型" };
  } else if (!sceneImageUrl) {
    return { ok: false as const, error: "請選擇場景照片" };
  }

  const characters = await charactersCollection();
  const character = (await characters.findOne({
    _id: new ObjectId(input.characterId),
    clerkUserId: user.clerkUserId,
  })) as Character | null;
  if (!character) return { ok: false as const, error: "角色不存在" };
  const identity = characterIdentityUrl(character);
  if (!identity) return { ok: false as const, error: "還沒有完成的藍圖" };
  const persona = parseCharacterPersona(character.persona);
  // The portrait is a close-up, so the full-body figure carries the preset outfit.
  const version = resolveDefaultVersion(character);
  const outfitRefUrl = version?.profileUrl && version.profileUrl !== identity ? version.profileUrl : "";
  const outfitText = version?.spec?.outfit ?? "";
  const hairText = version?.spec?.hair ?? "";

  const annotatedDataUrl =
    typeof input.annotatedSceneDataUrl === "string" &&
    input.annotatedSceneDataUrl.startsWith("data:image/")
      ? input.annotatedSceneDataUrl
      : undefined;
  const cleanRemarks = (input.remarks || [])
    .filter((r) => r && typeof r.comment === "string" && r.comment.trim().length > 0)
    .slice(0, 10)
    .map((r, idx) => ({
      number: Number.isInteger(r.number) ? r.number : idx + 1,
      colorName: String(r.colorName || `#${idx + 1}`).slice(0, 40),
      comment: r.comment.trim().slice(0, 240),
    }));
  const customInstruction = (input.customInstruction ?? "").trim().slice(0, 400);

  await assertCanSpendCredits(user, FRAME_COST);
  const spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
  try {
    const hasAnnotatedImage = Boolean(sceneImageUrl && annotatedDataUrl && cleanRemarks.length > 0);
    const poseRefUrl = pose ? await lifePoseReferenceUrl(pose.id) : "";
    // Order must match lifeReferenceOrder in life-prompt.ts.
    const refs = [
      identity,
      ...(outfitRefUrl ? [outfitRefUrl] : []),
      ...(sceneImageUrl ? [sceneImageUrl] : []),
      ...(hasAnnotatedImage && annotatedDataUrl ? [annotatedDataUrl] : []),
      ...(compositionRefUrl ? [compositionRefUrl] : []),
      ...(poseRefUrl ? [poseRefUrl] : []),
    ];
    const submitted = await submitOpenRouterImage({
      model: SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: lifeShotPrompt({
        name: character.name,
        kind: kindParsed.data,
        createMode: input.createMode,
        place,
        interests: persona?.interests ?? [],
        customInstruction,
        hasAnnotatedImage,
        remarks: cleanRemarks,
        hasScene: Boolean(sceneImageUrl),
        templateGuide: template?.promptGuide,
        hasCompositionRef: Boolean(compositionRefUrl),
        poseText: pose?.promptText,
        poseFraming: pose?.framing,
        poseHands: pose?.hands,
        hasOutfitRef: Boolean(outfitRefUrl),
        outfitText,
        hairText,
      }),
      aspectRatio: "9:16",
      resolution: "2k",
      referenceImageUrls: refs,
    });
    const imageUrl = submitted.images?.[0]?.url;
    if (!imageUrl) throw new Error("生活照生成失敗");
    const shotId = new ObjectId();
    const resultUrl = await persistMedia(
      imageUrl,
      `explainer/life/${character._id.toHexString()}/${shotId.toHexString()}.png`,
      {
        transform: (buffer) => sharp(buffer).png().toBuffer(),
        contentType: "image/png",
      },
    );
    const displayLabel =
      customInstruction.slice(0, 40) ||
      cleanRemarks[0]?.comment.slice(0, 40) ||
      place ||
      character.name;
    const shot: LifeShot = {
      _id: shotId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      characterId: character._id,
      characterName: character.name,
      place: displayLabel,
      kind: kindParsed.data,
      source: source.data,
      sceneImageUrl,
      resultUrl,
      ...(template ? { templateId: template.id } : {}),
      ...(compositionRefUrl ? { compositionRefUrl } : {}),
      ...(pose ? { poseId: pose.id } : {}),
      createdAt: new Date(),
    };
    const shots = await lifeShotsCollection();
    await shots.insertOne(shot);
    revalidatePath("/app/life");
    revalidatePath("/app/billing");
    return { ok: true as const, shot: toPublicShot(shot) };
  } catch (error) {
    console.error("[life] generate failed", error);
    try {
      await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
    } catch {
      // The generate error is the one the user can act on.
    }
    const message = error instanceof Error ? error.message : "生活照生成失敗";
    return { ok: false as const, error: message };
  }
}

export async function generateLifeCaptionAction(input: {
  shotId: string;
  language?: "yue" | "zh" | "en";
}) {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(input.shotId)) {
      return { ok: false as const, error: "找不到照片" };
    }
    const shots = await lifeShotsCollection();
    const shot = await shots.findOne({
      _id: new ObjectId(input.shotId),
      clerkUserId: user.clerkUserId,
    });
    if (!shot) return { ok: false as const, error: "找不到照片" };

    const characters = await charactersCollection();
    const character = (await characters.findOne({
      _id: shot.characterId,
      clerkUserId: user.clerkUserId,
    })) as Character | null;
    const persona = parseCharacterPersona(character?.persona);
    const lang = input.language ?? "yue";
    const langRule =
      lang === "en"
        ? "Write in natural, engaging English suitable for Instagram."
        : lang === "zh"
          ? "使用自然、有感染力的繁體中文撰寫 IG 貼文。"
          : "使用道地香港廣東話口語（繁體字，如「嘅、喺、真係、今日」）撰寫自然親切的 IG 貼文。";

    const { text } = await generateText({
      model: directorModel(),
      prompt: [
        `You are writing a high-engagement Instagram post caption and hashtags for AI KOL "${shot.characterName}".`,
        persona
          ? `Persona: city=${persona.city || "Hong Kong"}, warmth=${persona.warmth}, humor=${persona.humor}, summary=${persona.summary || ""}, interests=${(persona.interests || []).join(", ")}.`
          : "",
        `Photo context / scene: ${shot.place || "daily lifestyle moment"}.`,
        langRule,
        "Include a short catchy opening hook, 2–3 natural sentences in first person, a question to drive comments, and 6–8 relevant hashtags at the bottom. Return only the caption text.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return { ok: true as const, caption: text.trim() };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "產生貼文文案失敗",
    };
  }
}
