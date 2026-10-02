import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser, requireClerkUserId } from "@/service/auth";
import { resolveDefaultVersion } from "@/service/character/versions";
import {
  charactersCollection,
  generationJobsCollection,
  projectsCollection,
  skillsCollection,
  videosCollection,
} from "@/dao";
import { runPhaseAJob, runStillJob } from "@/service/director/jobs";
import { isVoLanguage } from "@/service/director/languages";
import { isVoiceGender, resolveVoiceGender } from "@/service/director/voice";
import { isSpeechPace } from "@/service/director/speech-pace";
import { isSceneTextLanguage } from "@/service/director/scene-text";
import { isDurationPreset } from "@/service/director/duration-presets";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import {
  applySkillSceneText,
  briefSkillError,
  isBookendSkill,
  skillBansNarration,
} from "@/service/director/skill-rules";
import { blobStoreHost, isBrandAssetUrl } from "@/service/video-edit/edit-state";
import { sanitizeFolderName } from "@/service/folder";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { isStyleId, type StyleId } from "@/service/style";
import type { CastMember, Character } from "@/model/character";
import { isProjectBusy } from "@/service/clip-stage";
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
  styleId: StyleId;
  source: string;
  spokenScript?: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  language: VoLanguage;
  voiceGender: VoiceGender;
  speechPace: SpeechPace;
  sceneTextEnabled: boolean;
  sceneTextLanguage: SceneTextLanguage;
  characterIds: string[];
  // Bookend skills only; undefined clears it.
  logoUrl?: string;
  // Up to 4 described scene references, ids R1..Rn.
  referenceImages: ReferenceImage[];
};

function readVideoBrief(
  formData: FormData,
  clerkUserId: string,
): { ok: true; brief: BriefFields } | { ok: false; error: string } {
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
  if (!source) return { ok: false, error: "請提供導演指示" };
  if (isTalkingHeadSkill(skillSlug) && !spokenScript) {
    return { ok: false, error: "請輸入角色要讀的講稿。" };
  }
  if (!["16:9", "9:16", "1:1"].includes(aspectRatio)) {
    return { ok: false, error: "請選擇畫面比例" };
  }
  if (!isDurationPreset(durationPreset)) {
    return { ok: false, error: "請選擇片長" };
  }
  if (!isVoLanguage(language)) {
    return { ok: false, error: skillBansNarration(skillSlug) ? "請選擇對白語言" : "請選擇旁白語言" };
  }
  if (!skillBansNarration(skillSlug) && !isVoiceGender(voiceGender)) {
    return { ok: false, error: "請選擇旁白聲線" };
  }
  if (!isSpeechPace(speechPace)) {
    return { ok: false, error: "請選擇語速" };
  }
  if (!isSceneTextLanguage(sceneTextLanguage)) {
    return { ok: false, error: "請選擇畫面文字語言" };
  }
  if (!isStyleId(styleId)) {
    return { ok: false, error: "請選擇視覺風格" };
  }
  // Logo is downloaded by image gen, so only this user's brand uploads are allowed.
  const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
  const rawLogo = String(formData.get("logoUrl") || "").trim();
  const logoUrl = isBookendSkill(skillSlug) && rawLogo ? rawLogo : undefined;
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
      ...(isTalkingHeadSkill(skillSlug) ? { spokenScript } : {}),
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
      characterIds,
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
  if (docs.some((doc) => doc.styleId !== styleId)) {
    return { ok: false, error: "角色風格與影片風格不同" };
  }
  const cast: CastMember[] = [];
  for (const id of characterIds) {
    const character = docs.find((doc) => doc._id.toHexString() === id)!;
    const version = resolveDefaultVersion(character);
    if (!version?.blueprintUrl) {
      return { ok: false, error: `角色 ${character.name} 尚未有可用藍圖` };
    }
    cast.push({
      characterId: character._id,
      versionId: version.id,
      name: character.name,
      blueprintUrl: version.blueprintUrl,
      prompt: version.prompt,
    });
  }
  return { ok: true, cast };
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
    const parsed = readVideoBrief(formData, user.clerkUserId);
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

    const skills = await skillsCollection();
    const skill = await skills.findOne({ slug: brief.skillSlug, isActive: true });
    if (!skill) return { ok: false, error: "找不到風格" };
    const skillError = briefSkillError({
      skillSlug: skill.slug,
      characterIds: brief.characterIds,
    });
    if (skillError) return { ok: false, error: skillError };

    const castResult = await buildCast(user.clerkUserId, brief.styleId, brief.characterIds);
    if (!castResult.ok) return castResult;
    const { cast } = castResult;

    const now = new Date();
    const videos = await videosCollection();
    const insert = await videos.insertOne({
      projectId: folder._id,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      skillId: skill._id,
      skillSlug: skill.slug,
      styleId: brief.styleId,
      source: brief.source,
      ...(brief.spokenScript ? { spokenScript: brief.spokenScript } : {}),
      aspectRatio: brief.aspectRatio,
      durationPreset: brief.durationPreset,
      language: brief.language,
      voiceGender: brief.voiceGender,
      speechPace: brief.speechPace,
      sceneTextEnabled: applySkillSceneText(skill.slug, brief.sceneTextEnabled),
      sceneTextLanguage: brief.sceneTextLanguage,
      ...(brief.logoUrl ? { logoUrl: brief.logoUrl } : {}),
      ...(brief.referenceImages.length ? { referenceImages: brief.referenceImages } : {}),
      cast,
      status: "phase_a",
      clips: [],
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
    const parsed = readVideoBrief(formData, user.clerkUserId);
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

    const skills = await skillsCollection();
    const skill = await skills.findOne({ slug: brief.skillSlug, isActive: true });
    if (!skill) return { ok: false, error: "找不到風格" };
    const skillError = briefSkillError({
      skillSlug: skill.slug,
      characterIds: brief.characterIds,
    });
    if (skillError) return { ok: false, error: skillError };

    const castResult = await buildCast(user.clerkUserId, brief.styleId, brief.characterIds);
    if (!castResult.ok) return castResult;

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
          skillSlug: skill.slug,
          styleId: brief.styleId,
          source: brief.source,
          ...(brief.spokenScript ? { spokenScript: brief.spokenScript } : {}),
          aspectRatio: brief.aspectRatio,
          durationPreset: brief.durationPreset,
          language: brief.language,
          voiceGender: brief.voiceGender,
          speechPace: brief.speechPace,
          sceneTextEnabled: applySkillSceneText(skill.slug, brief.sceneTextEnabled),
          sceneTextLanguage: brief.sceneTextLanguage,
          cast: castResult.cast,
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
        if (fresh) return { ok: true, project: toPublicVideo(fresh) };
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
      return { ok: true, project: toPublicVideo(promoted!) };
    }
    return { ok: true, project: toPublicVideo(video) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "讀取專案失敗",
    };
  }
}

// Keep the old name until the poll hook is switched.
export const getProjectAction = getVideoAction;
