import { generateText } from "ai";
import { ObjectId, type Filter, type UpdateFilter } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
  type LifeShotStatus,
} from "@/model/life-shot";
import type { LifeCreateMode } from "@/model/life-shot-kind";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { characterIdentityUrl } from "@/service/character/identity";
import {
  sanitizeWardrobePicks,
  wardrobePickPrompts,
  type CharacterWardrobePicks,
} from "@/service/character/character-look";
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

const STALE_LIFE_GENERATING_MS = 10 * 60_000;

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
  status: LifeShotStatus;
  error: string | null;
  templateId: string | null;
  createdAt: string;
};

export function toPublicShot(shot: LifeShot): PublicLifeShot {
  const status: LifeShotStatus =
    shot.status ?? (shot.resultUrl ? "completed" : "generating");
  return {
    id: shot._id.toHexString(),
    characterId: shot.characterId.toHexString(),
    characterName: shot.characterName,
    place: shot.place,
    kind: shot.kind,
    source: shot.source,
    sceneImageUrl: shot.sceneImageUrl,
    resultUrl: shot.resultUrl,
    status,
    error: shot.error ?? null,
    templateId: shot.templateId ?? null,
    createdAt: shot.createdAt.toISOString(),
  };
}

// Sweep any generating shots older than 10 minutes so stuck background tasks refund once.
async function settleStaleGeneratingShots(clerkUserId: string) {
  const shots = await lifeShotsCollection();
  const cutoff = new Date(Date.now() - STALE_LIFE_GENERATING_MS);
  const stale = await shots
    .find({
      clerkUserId,
      status: "generating",
      createdAt: { $lt: cutoff },
    })
    .limit(20)
    .toArray();
  for (const item of stale) {
    const claimed = await shots.findOneAndUpdate(
      { _id: item._id, status: "generating" },
      {
        $set: { status: "failed", error: "生成逾時，點數已退回" },
        $unset: { spendKey: "" },
      },
    );
    if (claimed && item.spendKey) {
      await refundCredits(clerkUserId, FRAME_COST, item.spendKey).catch(() => {});
    }
  }
}

export async function listLifePage(clerkUserId: string) {
  await settleStaleGeneratingShots(clerkUserId).catch(() => {});
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

// Lightweight poll action used by LifeDesk while background life shots are generating.
export async function listLifeShotsAction() {
  try {
    const user = await requireAppUser();
    await settleStaleGeneratingShots(user.clerkUserId).catch(() => {});
    const shots = await lifeShotsCollection();
    const recent = (await shots
      .find({ clerkUserId: user.clerkUserId })
      .sort({ createdAt: -1 })
      .limit(120)
      .toArray()) as LifeShot[];
    return { ok: true as const, shots: recent.map(toPublicShot) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "讀取生活照列表失敗",
    };
  }
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
    const hits = await searchPlaceScenes(
      lifeSceneQuery({ place, kind: kind.data, interest: input.interest }),
    );
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

type LifeJobDeps = {
  submitImage: (input: {
    model: string;
    prompt: string;
    aspectRatio: "9:16";
    resolution: "1k" | "2k";
    referenceImageUrls: string[];
  }) => Promise<{ images?: Array<{ url?: string }> }>;
  persistPng: (sourceUrl: string, blobKey: string) => Promise<string>;
  updateShot: (
    filter: Filter<LifeShot>,
    update: UpdateFilter<LifeShot>,
  ) => Promise<void>;
  refund: (clerkUserId: string, amount: number, spendKey: string) => Promise<unknown>;
  revalidate: () => void;
};

const defaultLifeJobDeps: LifeJobDeps = {
  submitImage: (input) => submitOpenRouterImage(input),
  persistPng: (sourceUrl, blobKey) =>
    persistMedia(sourceUrl, blobKey, {
      transform: (buffer) => sharp(buffer).png().toBuffer(),
      contentType: "image/png",
    }),
  updateShot: async (filter, update) => {
    const shots = await lifeShotsCollection();
    await shots.updateOne(filter, update);
  },
  refund: (clerkUserId, amount, spendKey) =>
    refundCredits(clerkUserId, amount, spendKey),
  revalidate: () => {
    try {
      revalidatePath("/app/life");
      revalidatePath("/app/billing");
    } catch {
      // Ignored outside Next request context.
    }
  },
};

// Background runner executed inside Next.js `after()` so multiple life photos can generate concurrently.
export async function runLifeShotJob(
  input: {
    shotId: ObjectId;
    clerkUserId: string;
    characterHexId: string;
    prompt: string;
    refs: string[];
    spendKey: string;
  },
  deps: LifeJobDeps = defaultLifeJobDeps,
) {
  try {
    const submitted = await deps.submitImage({
      model: SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: input.prompt,
      aspectRatio: "9:16",
      resolution: "2k",
      referenceImageUrls: input.refs,
    });
    const imageUrl = submitted.images?.[0]?.url;
    if (!imageUrl) throw new Error("生活照生成失敗");
    const blobKey = `explainer/life/${input.characterHexId}/${input.shotId.toHexString()}.png`;
    const resultUrl = await deps.persistPng(imageUrl, blobKey);
    await deps.updateShot(
      { _id: input.shotId, status: "generating" },
      {
        $set: {
          status: "completed",
          resultUrl,
        },
        $unset: { error: "", spendKey: "" },
      },
    );
    deps.revalidate();
  } catch (error) {
    console.error("[life] background generate failed", error);
    const message = error instanceof Error ? error.message : "生活照生成失敗";
    try {
      await deps.refund(input.clerkUserId, FRAME_COST, input.spendKey);
    } catch {
      // Keep the failure status update even if refund throws.
    }
    await deps
      .updateShot(
        { _id: input.shotId, status: "generating" },
        {
          $set: {
            status: "failed",
            error: message,
          },
          $unset: { spendKey: "" },
        },
      )
      .catch(() => {});
    deps.revalidate();
  }
}

// Enqueues a background life shot and returns the `generating` placeholder immediately.
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
  wardrobe?: CharacterWardrobePicks;
}) {
  const user = await requireAppUser();
  // Optional hair / top / pants / shoes / accessory picks that override the preset look.
  const wardrobe = wardrobePickPrompts(sanitizeWardrobePicks(input.wardrobe));
  const place = (input.place ?? "").trim().slice(0, 60);
  const template = lifePostTemplateById(input.templateId);
  const pose = lifePoseById(input.poseId);
  const kindParsed = lifeShotKindSchema.safeParse(
    template?.kind || input.kind || "selfie",
  );
  const source = lifeShotSourceSchema.safeParse(input.source);
  const sceneImageUrl = httpsUrl(input.sceneImageUrl ?? "");
  const compositionRefUrl = httpsUrl(input.compositionRefUrl ?? "");
  if (!ObjectId.isValid(input.characterId)) {
    return { ok: false as const, error: "角色不存在" };
  }
  if (!kindParsed.success) {
    return { ok: false as const, error: "請選擇生活照類型" };
  }
  if (!source.success) {
    return { ok: false as const, error: "請選擇場景照片" };
  }
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
  const outfitRefUrl =
    version?.profileUrl && version.profileUrl !== identity
      ? version.profileUrl
      : "";
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
    const hasAnnotatedImage = Boolean(
      sceneImageUrl && annotatedDataUrl && cleanRemarks.length > 0,
    );
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
    const prompt = lifeShotPrompt({
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
      wardrobe,
    });

    const shotId = new ObjectId();
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
      resultUrl: "",
      status: "generating",
      spendKey,
      ...(template ? { templateId: template.id } : {}),
      ...(compositionRefUrl ? { compositionRefUrl } : {}),
      ...(pose ? { poseId: pose.id } : {}),
      createdAt: new Date(),
    };
    const shots = await lifeShotsCollection();
    await shots.insertOne(shot);

    // Kick off generation in the background so the user can queue multiple photos concurrently.
    const characterHexId = character._id.toHexString();
    try {
      after(async () => {
        await runLifeShotJob({
          shotId,
          clerkUserId: user.clerkUserId,
          characterHexId,
          prompt,
          refs,
          spendKey,
        });
      });
    } catch {
      // Fallback when called outside a Next.js request context.
      void runLifeShotJob({
        shotId,
        clerkUserId: user.clerkUserId,
        characterHexId,
        prompt,
        refs,
        spendKey,
      });
    }

    return { ok: true as const, shot: toPublicShot(shot) };
  } catch (error) {
    console.error("[life] enqueue failed", error);
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

// Saves a filtered copy of a finished life shot as a new completed shot. No credits: the edit ran in the browser.
export async function saveEditedLifeShotAction(input: {
  sourceShotId: string;
  imageUrl: string;
  filterLabel: string;
}) {
  const user = await requireAppUser();
  const imageUrl = httpsUrl(input.imageUrl ?? "");
  if (!imageUrl) return { ok: false as const, error: "圖片上傳失敗" };
  if (!ObjectId.isValid(input.sourceShotId)) {
    return { ok: false as const, error: "找不到照片" };
  }
  const shots = await lifeShotsCollection();
  const source = await shots.findOne({
    _id: new ObjectId(input.sourceShotId),
    clerkUserId: user.clerkUserId,
  });
  if (!source || !source.resultUrl) return { ok: false as const, error: "找不到照片" };
  const label = (input.filterLabel ?? "").trim().slice(0, 30);
  const shot: LifeShot = {
    _id: new ObjectId(),
    userId: user._id,
    clerkUserId: user.clerkUserId,
    characterId: source.characterId,
    characterName: source.characterName,
    place: [source.place, label].filter(Boolean).join(" · ").slice(0, 80),
    kind: source.kind,
    source: "upload",
    sceneImageUrl: source.resultUrl,
    resultUrl: imageUrl,
    status: "completed",
    ...(source.templateId ? { templateId: source.templateId } : {}),
    ...(source.poseId ? { poseId: source.poseId } : {}),
    createdAt: new Date(),
  };
  await shots.insertOne(shot);
  revalidatePath("/app/life");
  return { ok: true as const, shot: toPublicShot(shot) };
}
