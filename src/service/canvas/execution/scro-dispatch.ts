// Dispatches Canvas `scro:*` tool nodes into Scro's domain services (`videos`,
// `jutsu_jobs`, `teleport_jobs`, ElevenLabs TTS, and Seedream 5.0 Pro) with
// single-billing (`skipBilling: true`) so `canvas_jobs` remains the sole charge/refund owner.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ObjectId } from "mongodb";
import {
  charactersCollection,
  productsCollection,
  usersCollection,
  videosCollection,
} from "@/dao";
import type { CanvasNode } from "@/model/canvas";
import type { Character } from "@/model/character";
import type { JutsuMode, JutsuObjectEditMode } from "@/model/jutsu-job";
import type { AspectRatio, DurationPreset, Project, VoLanguage } from "@/model/project";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { VIDEO_STYLE_TRANSFER_MODEL_ID } from "@/service/canvas/catalog/video-style-transfer";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import { planVideoStyleTransfer } from "@/service/canvas/execution/video-style-transfer";
import { pollExplainerFrame, submitExplainerFrame } from "@/service/canvas/directors/explainer-frame";
import { explainerVideoLookFields } from "@/service/canvas/directors/explainer-settings";
import { characterBlueprintGap } from "@/service/canvas/core/character-blueprint";
import { runCanvasCharacterBlueprint } from "@/service/canvas/execution/character-blueprint-run";
import { buildLifePhotoPrompt } from "@/service/canvas/scro-groups/life";
import { findSelectableSkill } from "@/service/director/selectable-skills";
import { behaviorSlug } from "@/service/director/behavior-slug";
import { persistBuffer, persistMedia } from "@/service/higgsfield/persist";
import {
  pollJutsuJobStatusForUser,
  startScroSwapJobForUser,
} from "@/service/jutsu/pipeline";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { buildPostCreatePrompt } from "@/service/post/prompts";
import { buildCast, buildProducts } from "@/service/project/actions";
import { runFfmpeg } from "@/service/reel/concat";
import {
  pollTeleportJobStatusForUser,
  startTeleportJobForUser,
} from "@/service/teleport/pipeline";
import { synthesizeSpeech, synthesizeSpeechWithTimestamps } from "@/service/voice/elevenlabs";
import {
  FEMALE_NARRATOR_VOICE_ID,
  MALE_NARRATOR_VOICE_ID,
  YUE_FEMALE_NARRATOR_VOICE_ID,
  YUE_MALE_NARRATOR_VOICE_ID,
  ZH_FEMALE_NARRATOR_VOICE_ID,
  ZH_MALE_NARRATOR_VOICE_ID,
  narratorVoiceId,
} from "@/service/voice/voice-swap-target";
import { schedulePhaseAWorkerTask } from "@/service/worker/schedule";

export type ScroToolValidationResult =
  | { ok: true }
  | { ok: false; missingRequiredFields: string[]; reason: string };

export function shouldSkipProjectBilling(project?: { skipBilling?: boolean } | null): boolean {
  return Boolean(project?.skipBilling);
}

export function resolveAutoVideoClipNumbers(
  frameClips: readonly number[],
  project?: { autoProduceAllClips?: boolean } | null,
): number[] {
  if (project?.autoProduceAllClips) {
    return Array.from(new Set(frameClips));
  }
  return frameClips.includes(1) ? [1] : [];
}

function readToolParamStr(node: CanvasNode, key: string): string | undefined {
  const val = node.data.toolParams?.[key];
  return typeof val === "string" && val.trim() ? val.trim() : undefined;
}

function readToolParamNum(node: CanvasNode, key: string): number | undefined {
  const val = node.data.toolParams?.[key];
  return typeof val === "number" && Number.isFinite(val) ? val : undefined;
}

function normalizeAspect(raw?: string): AspectRatio {
  if (raw === "16:9" || raw === "1:1") return raw;
  return "9:16";
}

function normalizeLanguage(raw?: string): VoLanguage {
  if (raw === "yue" || raw === "zh" || raw === "en") return raw;
  return "yue";
}

function normalizeDurationPreset(raw?: string): DurationPreset {
  if (raw === "auto" || raw === "micro" || raw === "short" || raw === "punchy" || raw === "full") {
    return raw;
  }
  if (raw === "15s") return "micro";
  if (raw === "30s") return "short";
  if (raw === "45s") return "punchy";
  if (raw === "60s") return "full";
  return "short";
}

function resolveTtsVoiceId(node: CanvasNode): { voiceId: string; language: VoLanguage } {
  const language = normalizeLanguage(readToolParamStr(node, "language"));
  const preset = readToolParamStr(node, "ttsVoiceId") ?? readToolParamStr(node, "voicePreset");
  const presetMap: Record<string, string> = {
    alan: YUE_MALE_NARRATOR_VOICE_ID,
    cathy: YUE_FEMALE_NARRATOR_VOICE_ID,
    yu: ZH_MALE_NARRATOR_VOICE_ID,
    una: ZH_FEMALE_NARRATOR_VOICE_ID,
    brian: MALE_NARRATOR_VOICE_ID,
    bella: FEMALE_NARRATOR_VOICE_ID,
  };
  if (preset && presetMap[preset.toLowerCase()]) {
    return { voiceId: presetMap[preset.toLowerCase()]!, language };
  }
  if (preset && preset.length >= 10) {
    return { voiceId: preset, language };
  }
  return { voiceId: narratorVoiceId(language, "female"), language };
}

export function validateScroToolInputs(
  modelId: string,
  node: CanvasNode,
  inputs: ResolvedCanvasInputs,
): ScroToolValidationResult {
  const characterId = readToolParamStr(node, "characterId");

  if (modelId === "scro:character") {
    const imageCount = inputs.refImages.length + (inputs.outfitRefs?.length ?? 0);
    if (characterBlueprintGap({ prompt: inputs.prompt, imageCount })) {
      return {
        ok: false,
        missingRequiredFields: ["refImages"],
        reason: "請描述角色，或接上參考圖／穿搭",
      };
    }
    return { ok: true };
  }

  if (modelId === "scro:talking-head") {
    const missing: string[] = [];
    if (!inputs.startImage && !characterId) {
      missing.push("startImage");
    }
    if (!inputs.prompt?.trim() && !inputs.refAudio) {
      missing.push("prompt");
    }
    if (missing.length > 0) {
      return {
        ok: false,
        missingRequiredFields: missing,
        reason: missing.includes("startImage")
          ? "Talking Head 需要連接起始圖片或選擇角色"
          : "Talking Head 需要輸入講稿或連接音訊",
      };
    }
    return { ok: true };
  }

  if (modelId === "scro:life") {
    if (!characterId) {
      return {
        ok: false,
        missingRequiredFields: ["characterId"],
        reason: "Life 生活照需要選擇角色",
      };
    }
    return { ok: true };
  }

  if (modelId === VIDEO_STYLE_TRANSFER_MODEL_ID) {
    const planned = planVideoStyleTransfer({
      node,
      videoUrl: inputs.video,
      catalog: STATIC_CANVAS_MODELS,
    });
    if (!planned.ok) {
      return {
        ok: false,
        missingRequiredFields: planned.missing,
        reason: planned.reason,
      };
    }
    return { ok: true };
  }

  return { ok: true };
}

async function defaultApplyAudioSpeed(buffer: Buffer, speed: number): Promise<Buffer> {
  if (!Number.isFinite(speed) || Math.abs(speed - 1) < 0.01) {
    return buffer;
  }
  const clamped = Math.min(2, Math.max(0.5, speed));
  const dir = await mkdtemp(join(tmpdir(), "canvas-tts-"));
  try {
    await writeFile(join(dir, "in.mp3"), buffer);
    await runFfmpeg(dir, [
      "-y",
      "-i",
      "in.mp3",
      "-filter:a",
      `atempo=${clamped}`,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      "out.mp3",
    ]);
    return await readFile(join(dir, "out.mp3"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function defaultLoadCharacterBlueprintUrl(
  clerkUserId: string,
  characterId: string,
): Promise<string | undefined> {
  if (!ObjectId.isValid(characterId)) return undefined;
  const col = await charactersCollection();
  const doc = (await col.findOne({
    _id: new ObjectId(characterId),
    clerkUserId,
  })) as Character | null;
  if (!doc) return undefined;
  const ver =
    doc.defaultVersionId
      ? doc.versions?.find((v) => v.id.equals(doc.defaultVersionId!))
      : doc.versions?.[doc.versions.length - 1];
  return ver?.blueprintUrl || ver?.profileUrl || ver?.portraitUrl || undefined;
}

export type ScroSyncDeps = {
  synthesizeSpeech: (
    voiceId: string,
    text: string,
    options?: { language?: string },
  ) => Promise<Buffer>;
  // On-camera delivery (Talking Head): same ElevenLabs settings the director uses for HeyGen.
  synthesizeConversational: (
    voiceId: string,
    text: string,
    options: { conversational: true; language: VoLanguage },
  ) => Promise<Buffer>;
  applyAudioSpeed: (buffer: Buffer, speed: number) => Promise<Buffer>;
  persistAudioBuffer: (buffer: Buffer, pathname: string, contentType: string) => Promise<string>;
  loadCharacterBlueprintUrl: (
    clerkUserId: string,
    characterId: string,
  ) => Promise<string | undefined>;
  submitImage: typeof submitOpenRouterImage;
  persistImageUrl: (url: string, pathname: string) => Promise<string>;
};

export async function executeScroSyncNode(
  params: {
    clerkUserId: string;
    jobIdHex: string;
    modelId: string;
    node: CanvasNode;
    inputs: ResolvedCanvasInputs;
  },
  deps?: Partial<ScroSyncDeps>,
): Promise<{ outputUrl: string; outputKind: "image" | "audio" }> {
  const resolved: ScroSyncDeps = {
    synthesizeSpeech: (voiceId, text, options) => synthesizeSpeech(voiceId, text, options),
    synthesizeConversational: async (voiceId, text, options) =>
      (await synthesizeSpeechWithTimestamps(voiceId, text, options)).audio,
    applyAudioSpeed: defaultApplyAudioSpeed,
    persistAudioBuffer: persistBuffer,
    loadCharacterBlueprintUrl: defaultLoadCharacterBlueprintUrl,
    submitImage: submitOpenRouterImage,
    persistImageUrl: (url, pathname) => persistMedia(url, pathname),
    ...deps,
  };

  if (params.modelId === "scro:tts") {
    const text = params.inputs.prompt?.trim() || "";
    if (!text) throw new Error("ElevenLabs TTS 需要輸入講稿文字");
    const { voiceId, language } = resolveTtsVoiceId(params.node);
    const speed = readToolParamNum(params.node, "ttsSpeed") ?? 1.0;

    let voiceIdToUse = voiceId;
    const characterId = readToolParamStr(params.node, "characterId");
    const conversational = params.node.data.toolParams?.ttsConversational === true;
    if (
      characterId &&
      ObjectId.isValid(characterId) &&
      !deps?.synthesizeSpeech &&
      !deps?.synthesizeConversational
    ) {
      const col = await charactersCollection();
      const charDoc = (await col.findOne({
        _id: new ObjectId(characterId),
        clerkUserId: params.clerkUserId,
      })) as Character | null;
      const clonedId =
        charDoc?.voiceSamples?.[language]?.elevenVoiceId ??
        charDoc?.voiceSample?.elevenVoiceId;
      if (clonedId) {
        voiceIdToUse = clonedId;
      }
    }

    const raw = conversational
      ? await resolved.synthesizeConversational(voiceIdToUse, text, { conversational: true, language })
      : await resolved.synthesizeSpeech(voiceIdToUse, text, { language });
    const processed =
      Math.abs(speed - 1) >= 0.01 ? await resolved.applyAudioSpeed(raw, speed) : raw;
    const outputUrl = await resolved.persistAudioBuffer(
      processed,
      `canvas/${params.clerkUserId}/${params.jobIdHex}.mp3`,
      "audio/mpeg",
    );
    return { outputUrl, outputKind: "audio" };
  }

  if (params.modelId === "scro:character") {
    return runCanvasCharacterBlueprint(params, {
      submitImage: resolved.submitImage,
      persistImageUrl: resolved.persistImageUrl,
    });
  }

  const characterId = readToolParamStr(params.node, "characterId");
  const blueprintUrl = characterId
    ? await resolved.loadCharacterBlueprintUrl(params.clerkUserId, characterId)
    : undefined;
  const refs = [
    ...(blueprintUrl ? [blueprintUrl] : []),
    ...params.inputs.refImages,
  ].slice(0, 14);
  const aspectRatio = normalizeAspect(params.node.data.aspectRatio ?? params.node.data.presetId);

  if (params.modelId === "scro:life") {
    if (characterId && !blueprintUrl) {
      throw new Error("找不到指定角色或角色定裝圖尚未完成");
    }
    const prompt = buildLifePhotoPrompt(params.inputs.prompt ?? "");
    const res = await resolved.submitImage({
      model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt,
      aspectRatio,
      resolution: "2k",
      referenceImageUrls: refs,
    });
    const rawUrl = res.images?.[0]?.url;
    if (res.status === "failed" || res.status === "nsfw" || !rawUrl) {
      throw new Error(res.error || "Life 生活照生成失敗");
    }
    const outputUrl = await resolved.persistImageUrl(
      rawUrl,
      `canvas/${params.clerkUserId}/${params.jobIdHex}.png`,
    );
    return { outputUrl, outputKind: "image" };
  }

  if (params.modelId === "scro:poster") {
    const promptInput = params.inputs.prompt?.trim() || "";
    if (!promptInput) throw new Error("Poster 海報貼文需要輸入設計提示詞");
    const productId = readToolParamStr(params.node, "productId");
    let productName: string | undefined;
    if (productId && ObjectId.isValid(productId) && !deps?.submitImage) {
      const pCol = await productsCollection();
      const prod = await pCol.findOne({
        _id: new ObjectId(productId),
        clerkUserId: params.clerkUserId,
      });
      if (prod?.blueprintUrl) refs.push(prod.blueprintUrl);
      if (prod?.name) productName = prod.name;
    }

    const posterPrompt = buildPostCreatePrompt({
      prompt: promptInput,
      products: productName ? [{ name: productName }] : [],
      hasReferenceImage: refs.length > 0,
    });
    const res = await resolved.submitImage({
      model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: posterPrompt,
      aspectRatio,
      resolution: "2k",
      referenceImageUrls: refs.slice(0, 14),
    });
    const rawUrl = res.images?.[0]?.url;
    if (res.status === "failed" || res.status === "nsfw" || !rawUrl) {
      throw new Error(res.error || "Poster 生成失敗");
    }
    const outputUrl = await resolved.persistImageUrl(
      rawUrl,
      `canvas/${params.clerkUserId}/${params.jobIdHex}.png`,
    );
    return { outputUrl, outputKind: "image" };
  }

  throw new Error(`不支援的同步 Scro 節點：${params.modelId}`);
}

export type ScroAsyncSubmitDeps = {
  startSwapForUser: typeof startScroSwapJobForUser;
  startTeleportForUser: typeof startTeleportJobForUser;
};

export async function submitScroAsyncNode(
  params: {
    clerkUserId: string;
    canvasIdHex: string;
    jobIdHex: string;
    modelId: string;
    node: CanvasNode;
    inputs: ResolvedCanvasInputs;
  },
  deps?: Partial<ScroAsyncSubmitDeps>,
): Promise<{
  domainKind: "video" | "jutsu" | "teleport" | "explainer_frame";
  externalJobId: string;
}> {
  const { clerkUserId, modelId, node, inputs } = params;
  const startSwapForUser = deps?.startSwapForUser ?? startScroSwapJobForUser;
  const startTeleportForUser = deps?.startTeleportForUser ?? startTeleportJobForUser;

  if (modelId === "scro:explainer-frame" || modelId === "scro:director-frame") {
    const prompt = inputs.prompt?.trim();
    if (!prompt) throw new Error("分鏡靜幀需要提示詞");
    return submitExplainerFrame({ clerkUserId, node, prompt });
  }

  if (modelId === "scro:swap" || modelId === "scro:swap-render") {
    if (!inputs.video) throw new Error("Scro Swap 需要連接輸入影片");
    // Render steps leave the grade to the group's FFmpeg Color Grade node.
    const applyColorFix = modelId === "scro:swap";
    const rawMode = readToolParamStr(node, "swapMode") ?? "character";
    const modeMap: Record<string, JutsuMode> = {
      character: "character_swap",
      object: "object_swap",
      relight: "relight_video",
      colorfix: "color_fix",
    };
    const mode = modeMap[rawMode] ?? "character_swap";
    const characterId = readToolParamStr(node, "characterId");
    const objectEditMode = (readToolParamStr(node, "objectEditMode") ?? "change") as JutsuObjectEditMode;
    const objectTarget = readToolParamStr(node, "objectTarget") ?? "person";

    const res = await startSwapForUser(
      clerkUserId,
      {
        mode,
        sourceVideoUrl: inputs.video,
        sectionStart: 0,
        sectionLength: Math.min(15, Math.max(2, Math.round(node.data.durationSeconds ?? 6))),
        characterId,
        referenceImageUrls: inputs.refImages.slice(0, 6),
        relightId: readToolParamStr(node, "lightLookId"),
        customLightPrompt: mode === "relight_video" ? inputs.prompt : undefined,
        customEditPrompt: mode === "character_swap" ? inputs.prompt : undefined,
        objectEditMode,
        objectTarget,
        objectChangeTo: mode === "object_swap" ? inputs.prompt : undefined,
        keepSourceAudio: true,
        applyColorFix,
      },
      { skipBilling: true },
    );
    if (!res.ok) throw new Error(res.error);
    return { domainKind: "jutsu", externalJobId: res.job.id };
  }

  if (modelId === "scro:teleport" || modelId === "scro:teleport-render") {
    if (!inputs.video) throw new Error("Teleport 需要連接輸入影片");
    if (modelId === "scro:teleport-render" && !inputs.image) {
      throw new Error("Teleport 需要連接場景圖");
    }
    const aspectRatio = normalizeAspect(node.data.aspectRatio ?? node.data.presetId);
    const res = await startTeleportForUser(
      clerkUserId,
      {
        sourceVideoUrl: inputs.video,
        aspectRatio,
        sectionStart: 0,
        sectionLength: Math.min(15, Math.max(2, Math.round(node.data.durationSeconds ?? 6))),
        sceneImageUrl: inputs.image,
        scenePrompt: inputs.prompt,
        keepSourceAudio: true,
        applyColorFix: modelId === "scro:teleport",
      },
      { skipBilling: true },
    );
    if (!res.ok) throw new Error(res.error);
    return { domainKind: "teleport", externalJobId: res.job.id };
  }

  if (modelId === "scro:talking-head" || modelId === "scro:explainer") {
    const videoId = await createCanvasDirectorVideo({ clerkUserId, modelId, node, inputs });
    schedulePhaseAWorkerTask(videoId);
    return { domainKind: "video", externalJobId: videoId.toHexString() };
  }

  throw new Error(`不支援的非同步 Scro 節點：${modelId}`);
}

// Inserts the backing `videos` doc for a canvas Talking Head / Explainer node (billing stays on canvas_jobs).
export async function createCanvasDirectorVideo(params: {
  clerkUserId: string;
  modelId: "scro:talking-head" | "scro:explainer";
  node: CanvasNode;
  inputs: ResolvedCanvasInputs;
  // Canvas Explainer planner: storyboard + prompts only, frames wait for frame nodes.
  planOnly?: boolean;
}): Promise<ObjectId> {
  const { clerkUserId, modelId, node, inputs } = params;
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId });
  if (!user) throw new Error("找不到使用者");

  const isTalking = modelId === "scro:talking-head";
  const skillSlug = isTalking
    ? "talking-head-director"
    : readToolParamStr(node, "skillSlug") || "cartoon-explainer-video-director";
  const skill = await findSelectableSkill(clerkUserId, skillSlug);
  if (!skill) throw new Error(`找不到導演風格：${skillSlug}`);
  const ruleSlug = behaviorSlug(skill);

  const characterId = readToolParamStr(node, "characterId");
  const characterIds = characterId ? [characterId] : [];
  const styleId = readToolParamStr(node, "styleId") || (isTalking ? "cinematic-realistic" : "whiteboard");
  const castResult = await buildCast(clerkUserId, styleId, characterIds, {});
  if (!castResult.ok) throw new Error(castResult.error);

  const productId = readToolParamStr(node, "productId");
  const productResult = await buildProducts(clerkUserId, productId ? [productId] : []);
  if (!productResult.ok) throw new Error(productResult.error);

  const language = normalizeLanguage(readToolParamStr(node, "language"));
  const aspectRatio = normalizeAspect(node.data.aspectRatio ?? node.data.presetId);
  const durationPreset = normalizeDurationPreset(readToolParamStr(node, "durationPreset"));
  // Explainer Settings (background, text style, on-screen text language) the card was planned with.
  const look = isTalking ? undefined : explainerVideoLookFields(node.data.toolParams, ruleSlug, language);
  const now = new Date();

  const videos = await videosCollection();
  const insert = await videos.insertOne({
    userId: user._id,
    clerkUserId,
    skillId: skill._id,
    skillSlug: ruleSlug,
    styleId,
    source: inputs.prompt?.trim() || (isTalking ? "Canvas Talking Head Director" : "Canvas Explainer"),
    ...(isTalking && inputs.prompt?.trim() ? { spokenScript: inputs.prompt.trim() } : {}),
    ...(isTalking ? { talkingHeadPoseId: readToolParamStr(node, "framing") ?? "collarbone-close" } : {}),
    aspectRatio,
    durationPreset: isTalking ? "short" : durationPreset,
    language,
    narrationEnabled: true,
    voiceGender: castResult.cast[0]?.voice?.gender ?? "female",
    speechPace: "medium",
    sceneTextEnabled: !isTalking,
    sceneTextLanguage: language === "en" ? "en" : "zh-Hant",
    subtitleLook: "handwritten",
    textStyleId: "handwritten",
    ...(look ?? {}),
    ...(isTalking && inputs.startImage ? { startImageUrl: inputs.startImage } : {}),
    ...(isTalking && inputs.refAudio
      ? {
          uploadedVoUrl: inputs.refAudio,
          uploadedVoDurationSeconds: Math.min(120, Math.max(5, Math.round(node.data.durationSeconds ?? 15))),
        }
      : {}),
    ...(inputs.refImages.length > 0
      ? {
          referenceImages: inputs.refImages.slice(0, 4).map((url, idx) => ({
            id: `R${idx + 1}`,
            url,
            name: `Ref ${idx + 1}`,
            description: `Reference image ${idx + 1}`,
            purpose: "scene" as const,
          })),
        }
      : {}),
    cast: castResult.cast,
    ...(productResult.products.length ? { products: productResult.products } : {}),
    status: "phase_a",
    clips: [],
    creditsCharged: false,
    skipBilling: true,
    autoProduceAllClips: !params.planOnly,
    ...(params.planOnly ? { canvasPlanOnly: true } : {}),
    createdAt: now,
    updatedAt: now,
  });

  return insert.insertedId;
}

export type PollScroAsyncDeps = {
  findVideo: (
    videoId: ObjectId,
    clerkUserId: string,
  ) => Promise<
    | Pick<
        Project,
        | "status"
        | "reelStatus"
        | "reelUrl"
        | "reelError"
        | "error"
        | "clips"
        | "frames"
        | "stillError"
        | "objectSheetError"
        | "backgroundPlateError"
      >
    | null
  >;
  pollJutsu: (
    clerkUserId: string,
    jobId: string,
  ) => ReturnType<typeof pollJutsuJobStatusForUser>;
  pollTeleport: (
    clerkUserId: string,
    jobId: string,
  ) => ReturnType<typeof pollTeleportJobStatusForUser>;
};

export async function pollScroAsyncJob(
  params: {
    clerkUserId: string;
    domainKind: "video" | "jutsu" | "teleport" | "explainer_frame";
    externalJobId: string;
  },
  deps?: Partial<PollScroAsyncDeps>,
): Promise<
  | { status: "running" }
  | { status: "completed"; outputUrl: string }
  | { status: "failed"; error: string }
> {
  const resolved: PollScroAsyncDeps = {
    findVideo: async (videoId, clerkUserId) => {
      const col = await videosCollection();
      return col.findOne({ _id: videoId, clerkUserId });
    },
    pollJutsu: pollJutsuJobStatusForUser,
    pollTeleport: pollTeleportJobStatusForUser,
    ...deps,
  };

  if (params.domainKind === "explainer_frame") {
    return pollExplainerFrame(
      { clerkUserId: params.clerkUserId, externalJobId: params.externalJobId },
      { findVideo: resolved.findVideo },
    );
  }

  if (params.domainKind === "video") {
    if (!ObjectId.isValid(params.externalJobId)) {
      return { status: "failed", error: "無效的影片專案 ID" };
    }
    const video = await resolved.findVideo(
      new ObjectId(params.externalJobId),
      params.clerkUserId,
    );
    if (!video) return { status: "failed", error: "找不到對應的影片任務" };
    if (video.reelStatus === "completed" && video.reelUrl) {
      return { status: "completed", outputUrl: video.reelUrl };
    }
    if (video.status === "failed" || video.reelStatus === "failed") {
      return {
        status: "failed",
        error: video.reelError || video.error || "Scro 影片生成失敗",
      };
    }
    if (video.stillError) {
      return { status: "failed", error: video.stillError };
    }
    if (video.objectSheetError) {
      return { status: "failed", error: video.objectSheetError };
    }
    if (video.backgroundPlateError) {
      return { status: "failed", error: video.backgroundPlateError };
    }
    const failedFrame = video.frames?.find((f) => f.status === "failed");
    if (failedFrame) {
      return { status: "failed", error: failedFrame.error || "分鏡畫格生成失敗" };
    }
    const failedClip = video.clips?.find((c) => c.status === "failed");
    if (failedClip) {
      return { status: "failed", error: failedClip.error || "分鏡片段生成失敗" };
    }
    // Single-clip fallback if all clips completed and reel was skipped
    if (
      video.clips?.length === 1 &&
      video.clips[0]?.status === "completed" &&
      (video.clips[0].blobUrl || video.clips[0].outputUrl) &&
      video.reelStatus !== "queued" &&
      video.reelStatus !== "in_progress"
    ) {
      return {
        status: "completed",
        outputUrl: (video.clips[0].blobUrl || video.clips[0].outputUrl)!,
      };
    }
    return { status: "running" };
  }

  if (params.domainKind === "jutsu") {
    const res = await resolved.pollJutsu(params.clerkUserId, params.externalJobId);
    if (!res.ok) return { status: "failed", error: res.error };
    if (res.job.status === "completed" && res.job.outputVideoUrl) {
      return { status: "completed", outputUrl: res.job.outputVideoUrl };
    }
    if (res.job.status === "completed" && res.job.outputImageUrl) {
      return { status: "completed", outputUrl: res.job.outputImageUrl };
    }
    if (res.job.status === "failed") {
      return { status: "failed", error: res.job.error || "Scro Swap 失敗" };
    }
    return { status: "running" };
  }

  const res = await resolved.pollTeleport(params.clerkUserId, params.externalJobId);
  if (!res.ok) return { status: "failed", error: res.error };
  if (res.job.status === "completed" && res.job.outputVideoUrl) {
    return { status: "completed", outputUrl: res.job.outputVideoUrl };
  }
  if (res.job.status === "failed") {
    return { status: "failed", error: res.job.error || "Teleport 失敗" };
  }
  return { status: "running" };
}
