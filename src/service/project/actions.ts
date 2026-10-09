import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser, requireClerkUserId } from "@/service/auth";
import { isCharacterVoice } from "@/model/character-voice";
import { characterStyleIds, resolveVersionForStyle } from "@/service/character/character-styles";
import {
  charactersCollection,
  generationJobsCollection,
  productsCollection,
  projectsCollection,
  textStylesCollection,
  videosCollection,
} from "@/dao";
import { runPhaseAJob, runStillJob } from "@/service/director/jobs";
import { behaviorSlug } from "@/service/director/behavior-slug";
import { findSelectableSkill, isHiddenPickerSkill } from "@/service/director/selectable-skills";
import { isVoLanguage } from "@/service/director/languages";
import { isVoiceGender, resolveVoiceGender } from "@/service/director/voice";
import { isSpeechPace } from "@/service/director/speech-pace";
import { isSceneTextLanguage } from "@/service/director/scene-text";
import { isSubtitleLook, resolveSubtitleLook } from "@/service/director/subtitle-look";
import { isDurationPreset } from "@/service/director/duration-presets";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import {
  applySkillSceneText,
  briefSkillError,
  isBookendSkill,
  skillBansNarration,
} from "@/service/director/skill-rules";
import { blobStoreHost, isBrandAssetUrl } from "@/service/video-edit/edit-state";
import { applyReusableEdit, hasReusableEdit } from "@/service/video-edit/edit-transition";
import { sanitizeFolderName } from "@/service/folder";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { isListedStyleId } from "@/service/style/list-selectable";
import type { CastMember, Character } from "@/model/character";
import { PRODUCT_MAX, type Product, type ProductShot } from "@/model/product";
import { isProjectBusy } from "@/service/clip-stage";
import { markUnsentClipVideos } from "@/service/clip/cancel-pending-video";
import { isReelBusy } from "@/service/reel/fingerprint";
import { recoverStaleReel } from "@/service/reel/enqueue";
import { applyPhaseAEdits } from "@/service/director/phase-a-edit";
import { collectVideoBlobUrls } from "@/service/video/storage";
import {
  RESTART_UNSET_FIELDS,
  restartBlobUrls,
  restartBlockReason,
} from "@/service/project/restart";
import type {
  AspectRatio,
  DurationPreset,
  PhaseAEditInput,
  ReferenceImage,
  SceneTextLanguage,
  SpeechPace,
  SubtitleLook,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
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
  source: string;
  spokenScript?: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  language: VoLanguage;
  voiceGender: VoiceGender;
  speechPace: SpeechPace;
  sceneTextEnabled: boolean;
  sceneTextLanguage: SceneTextLanguage;
  subtitleLook: SubtitleLook;
  textStyleId: string;
  textStyleImageUrl?: string;
  characterIds: string[];
  productIds: string[];
  // Bookend skills only; undefined clears it.
  logoUrl?: string;
  // Up to 4 described scene references, ids R1..Rn.
  referenceImages: ReferenceImage[];
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
  const styleId = String(formData.get("styleId") || "");
  const source = String(formData.get("source") || "").trim();
  const spokenScript = String(formData.get("spokenScript") || "").trim();
  const aspectRatio = String(formData.get("aspectRatio") || "") as AspectRatio;
  const durationPreset = String(formData.get("durationPreset") || "") as DurationPreset;
  const language = String(formData.get("language") || "en");
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
  if (!source) return { ok: false, error: "請提供導演指示" };
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
  if (!skillBansNarration(ruleSlug) && !isVoiceGender(voiceGender)) {
    return { ok: false, error: "請選擇旁白聲線" };
  }
  if (!isSpeechPace(speechPace)) {
    return { ok: false, error: "請選擇語速" };
  }
  if (!isSceneTextLanguage(sceneTextLanguage)) {
    return { ok: false, error: "請選擇畫面文字語言" };
  }
  const textStyle = await resolveTextStyleChoice(clerkUserId, textStyleRaw);
  if (!textStyle.ok) return textStyle;
  // Catalog ids and user-style ObjectId hex strings. Unknown strings are rejected, never doodle.
  if (!isListedStyleId(styleId)) {
    return { ok: false, error: "請選擇視覺風格" };
  }
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
  return {
    ok: true,
    brief: {
      skillSlug,
      styleId,
      source,
      ...(isTalkingHeadSkill(ruleSlug) ? { spokenScript } : {}),
      aspectRatio,
      durationPreset,
      logoUrl,
      referenceImages: references.images,
      language,
      voiceGender: resolveVoiceGender(voiceGender),
      speechPace,
      // 畫面文字永遠開啟，使用者只選語言。
      sceneTextEnabled: true,
      sceneTextLanguage,
      subtitleLook: textStyle.subtitleLook,
      textStyleId: textStyle.textStyleId,
      ...(textStyle.textStyleImageUrl ? { textStyleImageUrl: textStyle.textStyleImageUrl } : {}),
      characterIds,
      productIds,
    },
  };
}

async function buildCast(
  clerkUserId: string,
  styleId: string,
  characterIds: string[],
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
    const version = resolveVersionForStyle(character, styleId);
    if (!version?.blueprintUrl) {
      return { ok: false, error: `角色 ${character.name} 尚未有可用藍圖` };
    }
    cast.push({
      characterId: character._id,
      versionId: version.id,
      name: character.name,
      blueprintUrl: version.blueprintUrl,
      blueprintKind: version.blueprintKind ?? "sheet",
      prompt: version.prompt,
      // Appearance notes travel with the video so prompts stay stable after later edits.
      ...(version.spec ? { spec: version.spec } : {}),
      ...(isCharacterVoice(character.voice) ? { voice: character.voice } : {}),
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

function revalidateFolder(folderId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${folderId}`);
}

function revalidateVideo(videoId: string, folderId?: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${folderId || videoId}`);
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

// Create a video inside an existing folder and schedule Phase A.
// The client polls `getVideoAction` until status leaves "phase_a".
export async function createVideoAction(
  formData: FormData,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    const projectId = String(formData.get("projectId") || "");
    const skill = await findSelectableSkill(
      user.clerkUserId,
      String(formData.get("skillSlug") || ""),
    );
    if (!skill || isHiddenPickerSkill(skill)) return { ok: false, error: "找不到風格" };
    const ruleSlug = behaviorSlug(skill);
    const parsed = await readVideoBrief(formData, user.clerkUserId, ruleSlug);
    if (!parsed.ok) return parsed;
    const { brief } = parsed;

    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }

    const folders = await projectsCollection();
    const folder = await folders.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!folder) return { ok: false, error: "專案不存在" };

    const skillError = briefSkillError({
      skillSlug: ruleSlug,
      characterIds: brief.characterIds,
    });
    if (skillError) return { ok: false, error: skillError };

    const castResult = await buildCast(user.clerkUserId, brief.styleId, brief.characterIds);
    if (!castResult.ok) return castResult;
    const { cast } = castResult;
    const productResult = await buildProducts(user.clerkUserId, brief.productIds);
    if (!productResult.ok) return productResult;

    const now = new Date();
    const videos = await videosCollection();
    const inheritedEdit = applyReusableEdit(folder.editDefaults);
    const insert = await videos.insertOne({
      projectId: folder._id,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      skillId: skill._id,
      skillSlug: ruleSlug,
      styleId: brief.styleId,
      source: brief.source,
      ...(brief.spokenScript ? { spokenScript: brief.spokenScript } : {}),
      aspectRatio: brief.aspectRatio,
      durationPreset: brief.durationPreset,
      language: brief.language,
      voiceGender: brief.voiceGender,
      speechPace: brief.speechPace,
      sceneTextEnabled: applySkillSceneText(ruleSlug, brief.sceneTextEnabled),
      sceneTextLanguage: brief.sceneTextLanguage,
      subtitleLook: brief.subtitleLook,
      textStyleId: brief.textStyleId,
      ...(brief.textStyleImageUrl ? { textStyleImageUrl: brief.textStyleImageUrl } : {}),
      ...(brief.logoUrl ? { logoUrl: brief.logoUrl } : {}),
      ...(brief.referenceImages.length ? { referenceImages: brief.referenceImages } : {}),
      cast,
      ...(productResult.products.length ? { products: productResult.products } : {}),
      status: "phase_a",
      clips: [],
      ...(hasReusableEdit(folder.editDefaults) ? { edit: inheritedEdit } : {}),
      creditsCharged: false,
      createdAt: now,
      updatedAt: now,
    });

    after(() => runPhaseAJob(insert.insertedId));
    await folders.updateOne(
      { _id: folder._id },
      { $set: { updatedAt: new Date() } },
    );

    const video = await videos.findOne({ _id: insert.insertedId });
    revalidateFolder(projectId);
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
export async function updateVideoBriefAction(
  formData: FormData,
): Promise<VideoResult> {
  return rewriteVideoBrief(formData, { restart: false });
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
    revalidateVideo(videoId, video.projectId.toHexString());
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
    const skill = await findSelectableSkill(
      user.clerkUserId,
      String(formData.get("skillSlug") || ""),
    );
    if (!skill) return { ok: false, error: "找不到風格" };
    const ruleSlug = behaviorSlug(skill);
    const parsed = await readVideoBrief(formData, user.clerkUserId, ruleSlug);
    if (!parsed.ok) return parsed;
    const { brief } = parsed;
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
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

    const castResult = await buildCast(user.clerkUserId, brief.styleId, brief.characterIds);
    if (!castResult.ok) return castResult;
    const productResult = await buildProducts(user.clerkUserId, brief.productIds);
    if (!productResult.ok) return productResult;

    // Restart drops every stored frame / clip / export file and job first.
    if (options.restart) {
      const jobs = await generationJobsCollection();
      const jobDocs = await jobs.find({ projectId: video._id }).toArray();
      await deleteExplainerBlobUrls(restartBlobUrls(video, jobDocs));
      await jobs.deleteMany({ projectId: video._id });
    }

    await videos.updateOne(
      { _id: video._id },
      {
        $set: {
          ...(options.restart ? { clips: [] } : {}),
          skillId: skill._id,
          skillSlug: ruleSlug,
          styleId: brief.styleId,
          source: brief.source,
          ...(brief.spokenScript ? { spokenScript: brief.spokenScript } : {}),
          aspectRatio: brief.aspectRatio,
          durationPreset: brief.durationPreset,
          language: brief.language,
          voiceGender: brief.voiceGender,
          speechPace: brief.speechPace,
          sceneTextEnabled: applySkillSceneText(ruleSlug, brief.sceneTextEnabled),
          sceneTextLanguage: brief.sceneTextLanguage,
          subtitleLook: brief.subtitleLook,
          textStyleId: brief.textStyleId,
          ...(brief.textStyleImageUrl ? { textStyleImageUrl: brief.textStyleImageUrl } : {}),
          cast: castResult.cast,
          products: productResult.products,
          ...(brief.logoUrl ? { logoUrl: brief.logoUrl } : {}),
          ...(brief.referenceImages.length ? { referenceImages: brief.referenceImages } : {}),
          status: "phase_a",
          updatedAt: new Date(),
        },
        $unset: {
          ...(options.restart ? RESTART_UNSET_FIELDS : { error: "", stillError: "" }),
          ...(brief.logoUrl ? {} : { logoUrl: "" }),
          ...(brief.referenceImages.length ? {} : { referenceImages: "" }),
          ...(brief.spokenScript ? {} : { spokenScript: "" }),
          ...(brief.textStyleImageUrl ? {} : { textStyleImageUrl: "" }),
        },
      },
    );

    after(() => runPhaseAJob(video._id));

    const folders = await projectsCollection();
    await folders.updateOne(
      { _id: video.projectId },
      { $set: { updatedAt: new Date() } },
    );

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, video.projectId.toHexString());
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

    const folders = await projectsCollection();
    await folders.updateOne(
      { _id: video.projectId },
      { $set: { updatedAt: new Date() } },
    );

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, video.projectId.toHexString());
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

    const folders = await projectsCollection();
    await folders.updateOne(
      { _id: video.projectId },
      { $set: { updatedAt: new Date() } },
    );

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, video.projectId.toHexString());
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

    const folders = await projectsCollection();
    await folders.updateOne(
      { _id: video.projectId },
      { $set: { updatedAt: new Date() } },
    );

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(projectId, video.projectId.toHexString());
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

    const jobs = await generationJobsCollection();
    const jobDocs = await jobs.find({ projectId: video._id }).toArray();
    await deleteExplainerBlobUrls(collectVideoBlobUrls(video, jobDocs));
    await jobs.deleteMany({ projectId: video._id });

    const removed = await videos.deleteOne({
      _id: video._id,
      clerkUserId: user.clerkUserId,
    });
    if (removed.deletedCount !== 1) {
      return { ok: false, error: "影片不存在" };
    }

    const folders = await projectsCollection();
    await folders.updateOne(
      { _id: video.projectId },
      { $set: { updatedAt: new Date() } },
    );

    revalidateFolder(video.projectId.toHexString());
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
