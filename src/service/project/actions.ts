import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser, requireClerkUserId } from "@/service/auth";
import { parseCharacterPersona } from "@/model/character-persona";
import { isCharacterVoice } from "@/model/character-voice";
import { inferFallbackCharacterVoice } from "@/service/director/character-voice";
import { characterStyleIds } from "@/service/character/character-styles";
import {
  parseCharacterSelections,
  resolveCastVersion,
  type CharacterSelectionMap,
} from "@/service/character/character-presets";
import {
  charactersCollection,
  generationJobsCollection,
  opencutEditsCollection,
  productsCollection,
  projectsCollection,
  textStylesCollection,
  videosCollection,
} from "@/dao";
import { runPhaseAJob, runStillJob } from "@/service/director/jobs";
import { behaviorSlug } from "@/service/director/behavior-slug";
import { findBriefSkill, findSelectableSkill } from "@/service/director/selectable-skills";
import { isVoLanguage } from "@/service/director/languages";
import { isVoiceGender, resolveVoiceGender } from "@/service/director/voice";
import { isSpeechPace } from "@/service/director/speech-pace";
import { isSceneTextChoice, SCENE_TEXT_OFF } from "@/service/director/scene-text";
import { isSubtitleLook, resolveSubtitleLook } from "@/service/director/subtitle-look";
import { isDurationPreset } from "@/service/director/duration-presets";
import {
  isTalkingHeadBackgroundId,
  isTalkingHeadPoseId,
} from "@/model/talking-head-options";
import { isTalkingHeadSkill, TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";
import { parseBackgroundImageUrls } from "@/service/project/background-images";
import {
  parseStartImageUrl,
  talkingHeadOpeningPhotoAllowed,
} from "@/service/project/start-image";
import {
  applySkillSceneText,
  briefSkillError,
  isBookendSkill,
  maxStyleCountForSkill,
  skillBansNarration,
} from "@/service/director/skill-rules";
import { blobStoreHost, isBrandAssetUrl } from "@/service/video-edit/edit-state";
import { applyReusableEdit, hasReusableEdit } from "@/service/video-edit/edit-transition";
import type { Folder } from "@/model/folder";
import { sanitizeFolderName } from "@/service/folder";
import { folderVideoPath } from "@/service/folder-video-path";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { isListedStyleId } from "@/service/style/list-selectable";
import { resolveCharacterVoiceMode, type CastMember, type Character } from "@/model/character";
import { PRODUCT_MAX, type Product, type ProductShot } from "@/model/product";
import { isProjectBusy } from "@/service/clip-stage";
import { markUnsentClipVideos } from "@/service/clip/cancel-pending-video";
import { isReelBusy } from "@/service/reel/fingerprint";
import { recoverStaleReel } from "@/service/reel/enqueue";
import { applyPhaseAEdits } from "@/service/director/phase-a-edit";
import { invalidatePlatesForChangedVo } from "@/service/higgsfield/subtitle-plate-job";
import { clipsWithChangedVo } from "@/service/video-edit/subtitle-export";
import { collectVideoBlobUrls } from "@/service/video/storage";
import { deleteOpencutEdit } from "@/service/opencut/edit-store";
import {
  RESTART_UNSET_FIELDS,
  restartBlobUrls,
  restartBlockReason,
} from "@/service/project/restart";
import { cancelRestartImageJobs } from "@/service/project/restart-cancel";
import type {
  AspectRatio,
  DurationPreset,
  PhaseAEditInput,
  ReferenceImage,
  SceneTextChoice,
  SpeechPace,
  StoryboardClipDraft,
  SubtitleLook,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import {
  sanitizeClipDraftsInput,
  uploadClipDraftSketches,
} from "@/service/director/storyboard-draft-chat";
import { parseReferenceImages } from "@/service/project/reference-images";

const CAST_MAX = 4;

function canEditStoryboard(status: string) {
  return (
    status === "awaiting_approval" ||
    status === "failed" ||
    status === "production" ||
    status === "ready"
  );
}

type BriefFields = {
  skillSlug: string;
  styleId: string;
  styleIds: string[];
  source: string;
  spokenScript?: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  language: VoLanguage;
  narrationEnabled: boolean;
  voiceGender: VoiceGender;
  speechPace: SpeechPace;
  sceneTextEnabled: boolean;
  sceneTextLanguage: SceneTextChoice;
  subtitleLook: SubtitleLook;
  textStyleId: string;
  textStyleImageUrl?: string;
  characterIds: string[];
  characterSelections: CharacterSelectionMap;
  productIds: string[];
  // Bookend skills only; undefined clears it.
  logoUrl?: string;
  // Up to 4 described scene references, ids R1..Rn.
  referenceImages: ReferenceImage[];
  // Optional user-sketched or AI-drafted clip breakdowns created in Step 03.
  clipDrafts: StoryboardClipDraft[];
  // Talking-head read only. Up to 2 room photos that replace the bookshelf.
  backgroundImageUrls: string[];
  // Talking-head read only. Preset background & pose ids.
  talkingHeadBackgroundId?: string;
  talkingHeadPoseId?: string;
  // Talking-head read. One optional opening photo, on any visual style.
  startImageUrl?: string;
};

// System ids keep the extracted look. A user id loads that lettering sample.
async function resolveTextStyleChoice(
  clerkUserId: string,
  raw: string,
): Promise<
  | { ok: true; subtitleLook: SubtitleLook; textStyleId: string; textStyleImageUrl?: string }
  | { ok: false; error: string }
> {
  if (!raw || isSubtitleLook(raw)) {
    const look = resolveSubtitleLook(raw);
    return { ok: true, subtitleLook: look, textStyleId: look };
  }
  if (!ObjectId.isValid(raw)) return { ok: false, error: "請選擇文字樣式" };
  const styles = await textStylesCollection();
  const doc = await styles.findOne({ _id: new ObjectId(raw), clerkUserId });
  if (!doc) return { ok: false, error: "找不到文字樣式" };
  return {
    ok: true,
    subtitleLook: "handwritten",
    textStyleId: raw,
    textStyleImageUrl: doc.imageUrl,
  };
}

// `ruleSlug` is the behaviour slug; custom directors follow their template's rules.
async function readVideoBrief(
  formData: FormData,
  clerkUserId: string,
  ruleSlug: string,
): Promise<{ ok: true; brief: BriefFields } | { ok: false; error: string }> {
  const skillSlug = String(formData.get("skillSlug") || "");
  const rawStyleId = String(formData.get("styleId") || "");
  const maxStyles = maxStyleCountForSkill(ruleSlug);
  const rawStyleIds = Array.from(
    new Set(
      [
        ...formData.getAll("styleIds").map(String),
        ...(rawStyleId ? [rawStyleId] : []),
      ].filter(Boolean),
    ),
  ).slice(0, maxStyles);
  const styleId = rawStyleIds[0] || rawStyleId;
  const source = String(formData.get("source") || "").trim();
  const spokenScript = String(formData.get("spokenScript") || "").trim();
  const aspectRatio = String(formData.get("aspectRatio") || "") as AspectRatio;
  const durationPreset = String(formData.get("durationPreset") || "") as DurationPreset;
  const language = String(formData.get("language") || "en");
  const rawNarrationEnabled = formData.get("narrationEnabled");
  const narrationEnabled =
    rawNarrationEnabled === null
      ? true
      : rawNarrationEnabled !== "false" && rawNarrationEnabled !== "0";
  const voiceGender = String(formData.get("voiceGender") || "male");
  const speechPace = String(formData.get("speechPace") || "medium");
  const sceneTextLanguage = String(formData.get("sceneTextLanguage") || "en");
  const textStyleRaw = String(formData.get("textStyleId") || formData.get("subtitleLook") || "");
  const characterIds = Array.from(
    new Set(
      formData
        .getAll("characterIds")
        .map(String)
        .filter((id) => ObjectId.isValid(id)),
    ),
  );
  if (characterIds.length > CAST_MAX) {
    return { ok: false, error: `最多選 ${CAST_MAX} 個角色` };
  }
  const productIds = Array.from(
    new Set(
      formData
        .getAll("productIds")
        .map(String)
        .filter((id) => ObjectId.isValid(id)),
    ),
  );
  if (productIds.length > PRODUCT_MAX) {
    return { ok: false, error: `最多選 ${PRODUCT_MAX} 個產品` };
  }
  if (isTalkingHeadSkill(ruleSlug) && !spokenScript) {
    return { ok: false, error: "請輸入角色要讀的講稿。" };
  }
  if (!["16:9", "9:16", "1:1"].includes(aspectRatio)) {
    return { ok: false, error: "請選擇畫面比例" };
  }
  if (!isDurationPreset(durationPreset)) {
    return { ok: false, error: "請選擇片長" };
  }
  if (!isVoLanguage(language)) {
    return { ok: false, error: skillBansNarration(ruleSlug) ? "請選擇對白語言" : "請選擇旁白語言" };
  }
  if (
    !skillBansNarration(ruleSlug) &&
    narrationEnabled &&
    characterIds.length === 0 &&
    !isVoiceGender(voiceGender)
  ) {
    return { ok: false, error: "請選擇旁白聲線" };
  }
  if (!isSpeechPace(speechPace)) {
    return { ok: false, error: "請選擇語速" };
  }
  if (!isSceneTextChoice(sceneTextLanguage)) {
    return { ok: false, error: "請選擇畫面文字語言" };
  }
  const textStyle = await resolveTextStyleChoice(clerkUserId, textStyleRaw);
  if (!textStyle.ok) return textStyle;
  // Catalog ids and user-style ObjectId hex strings. Unknown strings are rejected, never doodle.
  if (!isListedStyleId(styleId) || rawStyleIds.some((id) => !isListedStyleId(id))) {
    return { ok: false, error: "請選擇視覺風格" };
  }
  const styleIds = rawStyleIds.length > 0 ? rawStyleIds : [styleId];
  // Logo is downloaded by image gen, so only this user's brand uploads are allowed.
  const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
  const rawLogo = String(formData.get("logoUrl") || "").trim();
  const logoUrl = isBookendSkill(ruleSlug) && rawLogo ? rawLogo : undefined;
  if (logoUrl && !isBrandAssetUrl(logoUrl, clerkUserId, storeHost)) {
    return { ok: false, error: "Logo 檔案無效，請重新上傳" };
  }
  // Image gen downloads these too, so only this user's brand uploads are allowed.
  const references = parseReferenceImages(String(formData.get("referenceImages") || ""), (url) =>
    isBrandAssetUrl(url, clerkUserId, storeHost),
  );
  if (!references.ok) return references;
  const backgrounds = parseBackgroundImageUrls(
    ruleSlug === TALKING_HEAD_SKILL_SLUG ? String(formData.get("backgroundImageUrls") || "") : "",
    (url) => isBrandAssetUrl(url, clerkUserId, storeHost),
  );
  if (!backgrounds.ok) return backgrounds;
  const rawThBg = String(formData.get("talkingHeadBackgroundId") || "").trim();
  const talkingHeadBackgroundId =
    ruleSlug === TALKING_HEAD_SKILL_SLUG && isTalkingHeadBackgroundId(rawThBg)
      ? rawThBg
      : undefined;
  const rawThPose = String(formData.get("talkingHeadPoseId") || "").trim();
  const talkingHeadPoseId =
    ruleSlug === TALKING_HEAD_SKILL_SLUG && isTalkingHeadPoseId(rawThPose)
      ? rawThPose
      : undefined;
  const startImage = talkingHeadOpeningPhotoAllowed({ skillSlug: ruleSlug })
    ? parseStartImageUrl(String(formData.get("startImageUrl") || ""), (url) =>
        isBrandAssetUrl(url, clerkUserId, storeHost),
      )
    : { ok: true as const, url: undefined };
  if (!startImage.ok) return startImage;
  let parsedClipDrafts: StoryboardClipDraft[] = [];
  const rawClipDrafts = String(formData.get("clipDrafts") || "").trim();
  if (rawClipDrafts) {
    try {
      parsedClipDrafts = sanitizeClipDraftsInput(JSON.parse(rawClipDrafts));
    } catch {
      parsedClipDrafts = [];
    }
  }
  const clipDrafts =
    parsedClipDrafts.length > 0
      ? await uploadClipDraftSketches(clerkUserId, parsedClipDrafts)
      : [];
  return {
    ok: true,
    brief: {
      skillSlug,
      styleId,
      styleIds,
      source,
      ...(isTalkingHeadSkill(ruleSlug) ? { spokenScript } : {}),
      aspectRatio,
      durationPreset,
      logoUrl,
      referenceImages: references.images,
      clipDrafts,
      backgroundImageUrls: backgrounds.urls,
      ...(talkingHeadBackgroundId ? { talkingHeadBackgroundId } : {}),
      ...(talkingHeadPoseId ? { talkingHeadPoseId } : {}),
      startImageUrl: startImage.url,
      language,
      narrationEnabled,
      voiceGender: resolveVoiceGender(voiceGender),
      speechPace,
      // None turns writing off. Any language keeps it on.
      sceneTextEnabled: sceneTextLanguage !== SCENE_TEXT_OFF,
      sceneTextLanguage,
      subtitleLook: textStyle.subtitleLook,
      textStyleId: textStyle.textStyleId,
      ...(textStyle.textStyleImageUrl ? { textStyleImageUrl: textStyle.textStyleImageUrl } : {}),
      characterIds,
      characterSelections: parseCharacterSelections(
        String(formData.get("characterSelections") || ""),
      ),
      productIds,
    },
  };
}

async function buildCast(
  clerkUserId: string,
  styleId: string,
  characterIds: string[],
  characterSelections: CharacterSelectionMap = {},
): Promise<{ ok: true; cast: CastMember[] } | { ok: false; error: string }> {
  if (characterIds.length === 0) return { ok: true, cast: [] };
  const characters = await charactersCollection();
  const docs = (await characters
    .find({
      _id: { $in: characterIds.map((id) => new ObjectId(id)) },
      clerkUserId,
    })
    .toArray()) as Character[];
  if (docs.length !== characterIds.length) {
    return { ok: false, error: "有角色不存在" };
  }
  if (docs.some((doc) => !characterStyleIds(doc).includes(styleId))) {
    return { ok: false, error: "角色風格與影片風格不同" };
  }
  const cast: CastMember[] = [];
  for (const id of characterIds) {
    const character = docs.find((doc) => doc._id.toHexString() === id)!;
    const { version, preset } = resolveCastVersion(
      character,
      styleId,
      characterSelections[id],
    );
    const pendingStyleVersion =
      version ??
      character.versions
        .filter(
          (v) =>
            (v.styleId || character.styleId) === styleId &&
            (v.status === "queued" || v.status === "in_progress"),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ??
      null;
    const activeVersion = version ?? pendingStyleVersion;
    const blueprintOrRefUrl =
      activeVersion?.blueprintUrl ||
      activeVersion?.portraitUrl ||
      activeVersion?.referenceImageUrl ||
      "";
    if (!activeVersion || (!blueprintOrRefUrl && activeVersion.status !== "queued" && activeVersion.status !== "in_progress")) {
      return { ok: false, error: `角色 ${character.name} 尚未有可用藍圖` };
    }
    const persona = parseCharacterPersona(character.persona);
    const resolvedVoice = isCharacterVoice(character.voice)
      ? character.voice
      : inferFallbackCharacterVoice(
          [character.name, activeVersion.spec?.identity, activeVersion.prompt].filter(Boolean).join("\n"),
        );
    const useDemoVoice = resolveCharacterVoiceMode(character) === "sample";
    cast.push({
      characterId: character._id,
      versionId: activeVersion.id,
      ...(preset ? { presetId: preset.id, presetName: preset.name } : {}),
      name: character.name,
      blueprintUrl: blueprintOrRefUrl,
      blueprintKind: activeVersion.blueprintKind ?? "sheet",
      prompt: activeVersion.prompt,
      // Appearance notes travel with the video so prompts stay stable after later edits.
      ...(activeVersion.spec ? { spec: activeVersion.spec } : {}),
      voice: resolvedVoice,
      ...(persona ? { persona } : {}),
      // Snapshot so a later sample change does not re-voice this video.
      ...(useDemoVoice && character.voiceSample
        ? {
            voiceSample: {
              url: character.voiceSample.url,
              elevenVoiceId: character.voiceSample.elevenVoiceId,
            },
          }
        : {}),
      ...(useDemoVoice && character.voiceSamples
        ? (() => {
            const voiceSamples: NonNullable<CastMember["voiceSamples"]> = {};
            for (const [lang, s] of Object.entries(character.voiceSamples)) {
              if (s?.url && s?.elevenVoiceId) {
                voiceSamples[lang as keyof typeof voiceSamples] = {
                  url: s.url,
                  elevenVoiceId: s.elevenVoiceId,
                };
              }
            }
            return Object.keys(voiceSamples).length > 0 ? { voiceSamples } : {};
          })()
        : {}),
    });
  }
  return { ok: true, cast };
}

// Products ignore the video style. Only a finished realistic sheet can be attached.
async function buildProducts(
  clerkUserId: string,
  productIds: string[],
): Promise<{ ok: true; products: ProductShot[] } | { ok: false; error: string }> {
  if (productIds.length === 0) return { ok: true, products: [] };
  const productsCol = await productsCollection();
  const docs = (await productsCol
    .find({
      _id: { $in: productIds.map((id) => new ObjectId(id)) },
      clerkUserId,
    })
    .toArray()) as Product[];
  if (docs.length !== productIds.length) return { ok: false, error: "有產品不存在" };
  const products: ProductShot[] = [];
  for (const id of productIds) {
    const product = docs.find((doc) => doc._id.toHexString() === id);
    if (!product?.blueprintUrl || product.status !== "completed") {
      return { ok: false, error: `產品 ${product?.name || ""} 尚未有可用藍圖` };
    }
    products.push({
      productId: product._id,
      name: product.name,
      blueprintUrl: product.blueprintUrl,
    });
  }
  return { ok: true, products };
}

type VideoResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

type FolderResult =
  | { ok: true; folder: { id: string; name: string } }
  | { ok: false; error: string };

function revalidateFolder(folderId?: string | null) {
  revalidatePath("/app");
  if (folderId) revalidatePath(`/app/projects/${folderId}`);
}

function revalidateVideo(videoId: string, folderId?: string | null) {
  revalidatePath("/app");
  revalidatePath(folderVideoPath(folderId, videoId));
  if (folderId) revalidatePath(`/app/projects/${folderId}`);
}

async function touchFolder(folderId?: ObjectId | null) {
  if (!folderId) return;
  const folders = await projectsCollection();
  await folders.updateOne({ _id: folderId }, { $set: { updatedAt: new Date() } });
}

function folderIdHex(folderId?: ObjectId | null) {
  return folderId ? folderId.toHexString() : undefined;
}

// Create a named folder (campaign). Videos are added separately.
export async function createFolderAction(name: string): Promise<FolderResult> {
  try {
    const user = await requireAppUser();
    const trimmed = sanitizeFolderName(name);
    if (!trimmed) return { ok: false as const, error: "請輸入專案名稱" };
    const folders = await projectsCollection();
    const now = new Date();
    const insert = await folders.insertOne({
      userId: user._id,
      clerkUserId: user.clerkUserId,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    });
    revalidatePath("/app");
    return {
      ok: true as const,
      folder: { id: insert.insertedId.toHexString(), name: trimmed },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "建立專案失敗",
    };
  }
}

// Reuse the user's most recent folder or create a default one so new users can jump straight to creating their first video.
export async function ensureDefaultFolderAction(
  defaultName = "我的第一個專案",
): Promise<FolderResult> {
  try {
    const user = await requireAppUser();
    const folders = await projectsCollection();
    const existing = await folders.findOne(
      { clerkUserId: user.clerkUserId, name: { $exists: true } },
      { sort: { updatedAt: -1 } },
    );
    if (existing && existing._id) {
      return {
        ok: true as const,
        folder: {
          id: existing._id.toHexString(),
          name: existing.name || defaultName,
        },
      };
    }
    const trimmed = sanitizeFolderName(defaultName) || "我的第一個專案";
    const now = new Date();
    const insert = await folders.insertOne({
      userId: user._id,
      clerkUserId: user.clerkUserId,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    });
    revalidatePath("/app");
    return {
      ok: true as const,
      folder: { id: insert.insertedId.toHexString(), name: trimmed },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "建立專案失敗",
    };
  }
}

// Rename a folder the signed-in user owns.
export async function renameFolderAction(
  folderId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    const trimmed = sanitizeFolderName(name);
    if (!trimmed) return { ok: false as const, error: "請輸入專案名稱" };
    if (!ObjectId.isValid(folderId)) {
      return { ok: false as const, error: "專案不存在" };
    }

    const folders = await projectsCollection();
    const result = await folders.updateOne(
      { _id: new ObjectId(folderId), clerkUserId: user.clerkUserId },
      { $set: { name: trimmed, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0) {
      return { ok: false as const, error: "專案不存在" };
    }

    revalidateFolder(folderId);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "重新命名失敗",
    };
  }
}

// Create a video inside an existing folder, or with no folder when projectId is omitted.
// The client polls `getVideoAction` until status leaves "phase_a".
export async function createVideoAction(
  formData: FormData,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    const projectId = String(formData.get("projectId") || "").trim();
    const skill = await findSelectableSkill(
      user.clerkUserId,
      String(formData.get("skillSlug") || ""),
    );
    if (!skill) return { ok: false, error: "找不到風格" };
    const ruleSlug = behaviorSlug(skill);
    const parsed = await readVideoBrief(formData, user.clerkUserId, ruleSlug);
    if (!parsed.ok) return parsed;
    const { brief } = parsed;

    let folder: Folder | null = null;
    if (projectId) {
      if (!ObjectId.isValid(projectId)) {
        return { ok: false, error: "專案不存在" };
      }
      const folders = await projectsCollection();
      folder = (await folders.findOne({
        _id: new ObjectId(projectId),
        clerkUserId: user.clerkUserId,
      })) as Folder | null;
      if (!folder) return { ok: false, error: "專案不存在" };
    }

    const skillError = briefSkillError({
      skillSlug: ruleSlug,
      characterIds: brief.characterIds,
    });
    if (skillError) return { ok: false, error: skillError };

    const castResult = await buildCast(
      user.clerkUserId,
      brief.styleId,
      brief.characterIds,
      brief.characterSelections,
    );
    if (!castResult.ok) return castResult;
    const { cast } = castResult;
    const productResult = await buildProducts(user.clerkUserId, brief.productIds);
    if (!productResult.ok) return productResult;

    const now = new Date();
    const videos = await videosCollection();
    const inheritedEdit = folder ? applyReusableEdit(folder.editDefaults) : undefined;
    const insert = await videos.insertOne({
      ...(folder?._id ? { projectId: folder._id } : {}),
      userId: user._id,
      clerkUserId: user.clerkUserId,
      skillId: skill._id,
      skillSlug: ruleSlug,
      styleId: brief.styleId,
      ...(brief.styleIds.length > 1 ? { styleIds: brief.styleIds } : {}),
      source: brief.source,
      ...(brief.spokenScript ? { spokenScript: brief.spokenScript } : {}),
      aspectRatio: brief.aspectRatio,
      durationPreset: brief.durationPreset,
      language: brief.language,
      narrationEnabled: brief.narrationEnabled,
      voiceGender: cast[0]?.voice?.gender ?? brief.voiceGender,
      speechPace: brief.speechPace,
      sceneTextEnabled:
        brief.sceneTextLanguage === SCENE_TEXT_OFF
          ? false
          : applySkillSceneText(ruleSlug, brief.sceneTextEnabled),
      sceneTextLanguage: brief.sceneTextLanguage,
      subtitleLook: brief.subtitleLook,
      textStyleId: brief.textStyleId,
      ...(brief.textStyleImageUrl ? { textStyleImageUrl: brief.textStyleImageUrl } : {}),
      ...(brief.logoUrl ? { logoUrl: brief.logoUrl } : {}),
      ...(brief.referenceImages.length ? { referenceImages: brief.referenceImages } : {}),
      ...(brief.clipDrafts.length ? { clipDrafts: brief.clipDrafts } : {}),
      ...(brief.backgroundImageUrls.length ? { backgroundImageUrls: brief.backgroundImageUrls } : {}),
      ...(brief.talkingHeadBackgroundId ? { talkingHeadBackgroundId: brief.talkingHeadBackgroundId } : {}),
      ...(brief.talkingHeadPoseId ? { talkingHeadPoseId: brief.talkingHeadPoseId } : {}),
      ...(brief.startImageUrl ? { startImageUrl: brief.startImageUrl } : {}),
      cast,
      ...(productResult.products.length ? { products: productResult.products } : {}),
      status: "phase_a",
      clips: [],
      ...(folder && hasReusableEdit(folder.editDefaults) && inheritedEdit
        ? { edit: inheritedEdit }
        : {}),
      creditsCharged: false,
      createdAt: now,
      updatedAt: now,
    });

    after(() => runPhaseAJob(insert.insertedId));
    if (folder?._id) {
      await touchFolder(folder._id);
    }

    const video = await videos.findOne({ _id: insert.insertedId });
    revalidateVideo(insert.insertedId.toHexString(), folderIdHex(folder?._id));
    return { ok: true, project: toPublicVideo(video!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "建立專案失敗",
    };
  }
}

// Keep the old name until the create form is switched in Task 6.
export const createProjectAction = createVideoAction;

// Rewrite the brief of an existing video and re-run Phase A (back to 分鏡).
// Rewriting the brief also wipes old generated frames, videos, jobs, and OpenCut edits.
export async function updateVideoBriefAction(
  formData: FormData,
): Promise<VideoResult> {
  return rewriteVideoBrief(formData, { restart: true });
}

// Lettering only. An existing video never reopens the brief, so this saves the
// look without rewriting the storyboard. The next generated frame uses it.
export async function updateVideoTextStyleAction(
  videoId: string,
  textStyleId: string,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
    const choice = await resolveTextStyleChoice(user.clerkUserId, textStyleId);
    if (!choice.ok) return choice;

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };

    await videos.updateOne(
      { _id: video._id },
      {
        $set: {
          subtitleLook: choice.subtitleLook,
          textStyleId: choice.textStyleId,
          updatedAt: new Date(),
          ...(choice.textStyleImageUrl ? { textStyleImageUrl: choice.textStyleImageUrl } : {}),
        },
        ...(choice.textStyleImageUrl ? {} : { $unset: { textStyleImageUrl: "" } }),
      },
    );

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, folderIdHex(video.projectId));
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更新文字樣式失敗",
    };
  }
}

// Start over: wipe storyboard, stills, clip videos, and exports, then re-run
// Phase A from the (possibly edited) brief. Spent credits are not refunded.
export async function restartVideoAction(
  formData: FormData,
): Promise<VideoResult> {
  return rewriteVideoBrief(formData, { restart: true });
}

async function rewriteVideoBrief(
  formData: FormData,
  options: { restart: boolean },
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(formData.get("videoId") || "");
    const requestedSlug = String(formData.get("skillSlug") || "");
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    const skill = await findBriefSkill(user.clerkUserId, requestedSlug, video.skillSlug);
    if (!skill) return { ok: false, error: "找不到風格" };
    const ruleSlug = behaviorSlug(skill);
    const parsed = await readVideoBrief(formData, user.clerkUserId, ruleSlug);
    if (!parsed.ok) return parsed;
    const { brief } = parsed;
    if (options.restart) {
      const blocked = restartBlockReason(video);
      if (blocked) return { ok: false, error: blocked };
    } else if (video.status === "phase_a" || isProjectBusy(video)) {
      return { ok: false, error: "請等目前的產生工作結束再改導演指示" };
    }

    const skillError = briefSkillError({
      skillSlug: ruleSlug,
      characterIds: brief.characterIds,
    });
    if (skillError) return { ok: false, error: skillError };

    const castResult = await buildCast(
      user.clerkUserId,
      brief.styleId,
      brief.characterIds,
      brief.characterSelections,
    );
    if (!castResult.ok) return castResult;
    const productResult = await buildProducts(user.clerkUserId, brief.productIds);
    if (!productResult.ok) return productResult;

    // Restart drops every stored frame / clip / export / OpenCut file and job first.
    if (options.restart) {
      await cancelRestartImageJobs(video);
      const [jobs, edits] = await Promise.all([
        generationJobsCollection(),
        opencutEditsCollection(),
      ]);
      const [jobDocs, editDoc] = await Promise.all([
        jobs.find({ projectId: video._id }).toArray(),
        edits.findOne({ _id: video._id }),
      ]);
      await deleteExplainerBlobUrls(restartBlobUrls(video, jobDocs, editDoc?.media));
      await Promise.all([
        jobs.deleteMany({ projectId: video._id }),
        edits.deleteOne({ _id: video._id }),
      ]);
    }

    await videos.updateOne(
      { _id: video._id },
      {
        $set: {
          ...(options.restart ? { clips: [] } : {}),
          skillId: skill._id,
          skillSlug: ruleSlug,
          styleId: brief.styleId,
          ...(brief.styleIds.length > 1 ? { styleIds: brief.styleIds } : {}),
          source: brief.source,
          ...(brief.spokenScript ? { spokenScript: brief.spokenScript } : {}),
          aspectRatio: brief.aspectRatio,
          durationPreset: brief.durationPreset,
          language: brief.language,
          narrationEnabled: brief.narrationEnabled,
          voiceGender: castResult.cast[0]?.voice?.gender ?? brief.voiceGender,
          speechPace: brief.speechPace,
          sceneTextEnabled:
        brief.sceneTextLanguage === SCENE_TEXT_OFF
          ? false
          : applySkillSceneText(ruleSlug, brief.sceneTextEnabled),
          sceneTextLanguage: brief.sceneTextLanguage,
          subtitleLook: brief.subtitleLook,
          textStyleId: brief.textStyleId,
          ...(brief.textStyleImageUrl ? { textStyleImageUrl: brief.textStyleImageUrl } : {}),
          cast: castResult.cast,
          products: productResult.products,
          ...(brief.logoUrl ? { logoUrl: brief.logoUrl } : {}),
          ...(brief.referenceImages.length ? { referenceImages: brief.referenceImages } : {}),
          ...(brief.clipDrafts.length ? { clipDrafts: brief.clipDrafts } : {}),
          ...(brief.backgroundImageUrls.length
            ? { backgroundImageUrls: brief.backgroundImageUrls }
            : {}),
          ...(brief.talkingHeadBackgroundId
            ? { talkingHeadBackgroundId: brief.talkingHeadBackgroundId }
            : {}),
          ...(brief.talkingHeadPoseId ? { talkingHeadPoseId: brief.talkingHeadPoseId } : {}),
          ...(brief.startImageUrl ? { startImageUrl: brief.startImageUrl } : {}),
          status: "phase_a",
          updatedAt: new Date(),
        },
        $unset: {
          ...(options.restart ? RESTART_UNSET_FIELDS : { error: "", stillError: "" }),
          ...(brief.logoUrl ? {} : { logoUrl: "" }),
          ...(brief.referenceImages.length ? {} : { referenceImages: "" }),
          ...(brief.clipDrafts.length ? {} : { clipDrafts: "" }),
          ...(brief.backgroundImageUrls.length ? {} : { backgroundImageUrls: "" }),
          ...(brief.talkingHeadBackgroundId ? {} : { talkingHeadBackgroundId: "" }),
          ...(brief.talkingHeadPoseId ? {} : { talkingHeadPoseId: "" }),
          ...(brief.startImageUrl ? {} : { startImageUrl: "" }),
          ...(brief.spokenScript ? {} : { spokenScript: "" }),
          ...(brief.textStyleImageUrl ? {} : { textStyleImageUrl: "" }),
          ...(brief.styleIds.length > 1 ? {} : { styleIds: "" }),
        },
      },
    );

    // The previous cut must not come back over the new storyboard.
    if (options.restart) await deleteOpencutEdit(videoId);

    after(() => runPhaseAJob(video._id));

    await touchFolder(video.projectId);

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, folderIdHex(video.projectId));
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更新導演指示失敗",
    };
  }
}

// Persist user edits to the Phase A proposal and clip rows (no credits).
export async function updatePhaseAProposalAction(
  videoId: string,
  input: PhaseAEditInput,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video?.phaseA) return { ok: false, error: "專案不存在" };
    if (!canEditStoryboard(video.status)) {
      return { ok: false, error: "這個專案目前不能編輯分鏡提案" };
    }

    const applied = applyPhaseAEdits(video.phaseA, input, video.language, video.skillSlug);
    if (!applied.ok) return { ok: false, error: applied.error };

    await videos.updateOne(
      { _id: video._id },
      {
        $set: {
          phaseA: applied.phaseA,
          error: undefined,
          updatedAt: new Date(),
        },
      },
    );
    // A changed spoken line makes its finished subtitle plate wrong (free; the user redoes it).
    if (video.subtitleOverlay === true) {
      await invalidatePlatesForChangedVo(
        video._id,
        clipsWithChangedVo(video.phaseA.clips, applied.phaseA.clips),
      );
    }

    await touchFolder(video.projectId);

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, folderIdHex(video.projectId));
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "儲存分鏡提案失敗",
    };
  }
}

// Re-run Phase A with user notes; also non-blocking.
export async function reviseProjectAction(
  formData: FormData,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(formData.get("projectId") || "");
    const note = String(formData.get("note") || "").trim();
    const clipsOnly = String(formData.get("clipsOnly") || "") === "1";
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    if (!canEditStoryboard(video.status)) {
      return { ok: false, error: "這個專案目前不能改稿" };
    }
    if (isProjectBusy(video)) {
      return { ok: false, error: "請等目前的產生工作結束再改稿" };
    }

    await videos.updateOne(
      { _id: video._id },
      { $set: { status: "phase_a", error: undefined, updatedAt: new Date() } },
    );

    after(() =>
      runPhaseAJob(video._id, note || undefined, { clipsOnly }),
    );

    await touchFolder(video.projectId);

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, folderIdHex(video.projectId));
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "改稿失敗",
    };
  }
}

// Retry a failed video: back to Phase A when the storyboard never landed,
// otherwise straight into per-clip production. Failed frames/videos already
// refunded their own credits, so nothing is charged here.
export async function retryProjectAction(
  projectId: string,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    if (video.status !== "failed") {
      return { ok: false, error: "只有失敗的專案可以重試" };
    }

    const jobs = await generationJobsCollection();

    if (!video.phaseA) {
      // Storyboard never landed: rerun Phase A in the background.
      await videos.updateOne(
        { _id: video._id },
        { $set: { status: "phase_a", error: undefined, updatedAt: new Date() } },
      );
      after(() => runPhaseAJob(video._id));
    } else {
      // Legacy frame/video-stage failures: drop failed still jobs and reopen
      // per-clip production with whatever frames/clips already exist.
      await jobs.deleteMany({
        projectId: video._id,
        kind: "still",
        status: { $in: ["failed", "nsfw"] },
      });
      await videos.updateOne(
        { _id: video._id },
        {
          $set: { status: "production", error: undefined, updatedAt: new Date() },
          $unset: { stillError: "", framesSubmittedAt: "" },
        },
      );
    }

    await touchFolder(video.projectId);

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(projectId, folderIdHex(video.projectId));
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "重試失敗",
    };
  }
}

export type DeleteVideoResult = { ok: true } | { ok: false; error: string };

// Delete a video, its generation jobs, and every stored frame/clip/reel file.
export async function deleteVideoAction(
  videoId: string,
): Promise<DeleteVideoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "影片不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "影片不存在" };

    const [jobs, edits] = await Promise.all([
      generationJobsCollection(),
      opencutEditsCollection(),
    ]);
    const [jobDocs, editDoc] = await Promise.all([
      jobs.find({ projectId: video._id }).toArray(),
      edits.findOne({ _id: video._id }),
    ]);
    await deleteExplainerBlobUrls(collectVideoBlobUrls(video, jobDocs, editDoc?.media));
    await Promise.all([
      jobs.deleteMany({ projectId: video._id }),
      edits.deleteOne({ _id: video._id }),
    ]);

    const removed = await videos.deleteOne({
      _id: video._id,
      clerkUserId: user.clerkUserId,
    });
    if (removed.deletedCount !== 1) {
      return { ok: false, error: "影片不存在" };
    }

    await touchFolder(video.projectId);

    revalidateFolder(folderIdHex(video.projectId));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除影片失敗",
    };
  }
}

// Lightweight read used by the client while a background job is running.
export async function getVideoAction(videoId: string): Promise<VideoResult> {
  try {
    // Editor open + poll: ownership check only, skip affiliate/user round-trips.
    const clerkUserId = await requireClerkUserId();
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }
    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    // Editor poll: a reel left in_progress after the worker died gets retried here.
    if (isReelBusy(video.reelStatus)) {
      const recovered = await recoverStaleReel(video);
      if (recovered) {
        const fresh = await videos.findOne({ _id: video._id });
        if (fresh) return { ok: true, project: toPublicVideo(await markUnsentClipVideos(fresh)) };
      }
    }
    // Leftover 核准分鏡 videos enter 製作 the first time they are opened.
    if (video.status === "awaiting_approval" && video.phaseA) {
      await videos.updateOne(
        { _id: video._id },
        {
          $set: { status: "production", updatedAt: new Date() },
          $unset: { stillError: "", error: "" },
        },
      );
      after(() => runStillJob(video._id));
      const promoted = await videos.findOne({ _id: video._id });
      return { ok: true, project: toPublicVideo(await markUnsentClipVideos(promoted!)) };
    }
    const flagged = await markUnsentClipVideos(video);
    return { ok: true, project: toPublicVideo(flagged) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "讀取專案失敗",
    };
  }
}

// Keep the old name until the poll hook is switched.
export const getProjectAction = getVideoAction;
