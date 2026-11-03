import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { generationJobsCollection, usersCollection, videosCollection } from "@/dao";
import type {
  ClipAppend,
  ClipAppendMode,
  ClipDirectorOverrides,
  DurationPreset,
  SceneTextChoice,
  SpeechPace,
  StoryboardRow,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import { isTalkingHeadPoseId } from "@/model/talking-head-options";
import type { CharacterSelectionMap } from "@/service/character/character-presets";
import { withCurrentCharacterVoices } from "@/service/character/voice-cast";
import {
  CLIP_APPEND_LEASE_MS,
  nextClipAppend,
  shiftPendingInserts,
  trimFailedClipAppends,
} from "@/service/clip/clip-append";
import { attachClipOverrides, clipsShareContinuity } from "@/service/clip/clip-context";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  getActiveSubscription,
  hasPaidOrCreditAccess,
  refundCredits,
} from "@/service/billing/credits";
import { withUnlimitedCredits } from "@/service/billing/unlimited-credits";
import { FRAME_COST } from "@/service/credit-costs";
import { enqueueSubtitlePlateJobs } from "@/service/higgsfield/subtitle-plate-job";
import { usesTalkingHeadSubtitleOverlay } from "@/service/director/subtitle-plate";
import { isSceneTextChoice, resolveSceneText, SCENE_TEXT_OFF } from "@/service/director/scene-text";
import {
  applyClipOrder,
  insertClips,
  removeClip,
} from "@/service/clip/clip-order";
import { APPEND_CLIP_MAX, draftAppendedClips } from "@/service/director/append-clip";
import { behaviorSlug } from "@/service/director/behavior-slug";
import { isDurationPreset } from "@/service/director/duration-presets";
import { isVoLanguage } from "@/service/director/languages";
import { loadStoredSkill } from "@/service/director/load-skill";
import { sanitizeOutfitChangePhaseA } from "@/service/director/outfit-change";
import { sanitizeOutfitPhaseA } from "@/service/director/outfit-reel";
import { runPhaseA } from "@/service/director/run-phase-a";
import { MissingTemplateError, resolveRunSkill } from "@/service/director/run-skill";
import { findSelectableSkill } from "@/service/director/selectable-skills";
import {
  applySkillSceneText,
  briefSkillError,
  defaultDirectorBackgroundId,
  isBookendSkill,
  isOutfitChangeSkill,
  isOutfitReelSkill,
  isSurpriseInterviewSkill,
  isValidDirectorBackgroundId,
} from "@/service/director/skill-rules";
import { isSpeechPace } from "@/service/director/speech-pace";
import { sanitizeSurprisePhaseA } from "@/service/director/surprise-interview";
import { isTalkingHeadSkill, talkingHeadSpokenError } from "@/service/director/talking-head";
import { isVoiceGender, resolveVoiceGender } from "@/service/director/voice";
import { clipFrameCost, isMediaBusy, isProjectBusy } from "@/service/clip-stage";
import { enqueueClipFrameJobs, stillBlocker } from "@/service/higgsfield/pipeline";
import { buildCast, buildProducts } from "@/service/project/actions";
import { isReelBusy } from "@/service/reel/fingerprint";
import { isProductionLike } from "@/service/project-status";
import { isListedStyleId } from "@/service/style/list-selectable";
import { hydrateStyles } from "@/service/style/load-style";
import { isRealisticStyle } from "@/service/style/realistic-light";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import {
  collectClipVideoBlobUrls,
  collectFrameBlobUrls,
  collectSubtitlePlateBlobUrls,
} from "@/service/video/storage";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";

const CONTENT_MAX = 2000;
const FULL_VIDEO_CONTENT_MAX = 10000;

export type AppendDirectorClipInput = {
  videoId: string;
  content: string;
  spokenScript?: string;
  insertAt?: number;
  mode?: "single_clip" | "full_video";
  skillSlug?: string;
  styleId?: string;
  characterIds?: string[];
  characterSelections?: CharacterSelectionMap;
  productIds?: string[];
  language?: VoLanguage;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  sceneTextLanguage?: SceneTextChoice;
  durationPreset?: DurationPreset;
  directorBackgroundId?: string;
  backgroundImageUrls?: string[];
  talkingHeadPoseId?: string;
  logoUrl?: string;
  uploadedVoUrl?: string;
  uploadedVoDurationSeconds?: number;
};

type TimelineResult = { ok: true; project: PublicVideo } | { ok: false; error: string };

function revalidateVideo(projectId?: string) {
  revalidatePath("/app");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

function fail(error: unknown, fallback: string): TimelineResult {
  console.error(fallback, error);
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// Queue a single-clip or full-video director write with optional per-clip director/style/cast overrides.
export async function appendDirectorClipAction(
  input: AppendDirectorClipInput,
): Promise<TimelineResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(input?.videoId ?? "");
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
    const mode: ClipAppendMode = input?.mode === "full_video" ? "full_video" : "single_clip";

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!hasPaidOrCreditAccess(user, sub)) return { ok: false, error: "需要有可用 credits 或訂閱才能新增片段" };

    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) return { ok: false, error: "分鏡尚未完成" };
    const pending = (project.clipAppends ?? []).filter((job) => job.status !== "failed").length;
    if (project.phaseA.clips.length + pending >= APPEND_CLIP_MAX) {
      return { ok: false, error: `最多 ${APPEND_CLIP_MAX} 段` };
    }
    const insertAt =
      mode === "full_video"
        ? project.phaseA.clips.length + 1
        : (input.insertAt ?? project.phaseA.clips.length + 1);
    if (!Number.isInteger(insertAt) || insertAt < 1 || insertAt > project.phaseA.clips.length + 1) {
      return { ok: false, error: "插入位置不正確" };
    }
    const shiftsLaterClips = insertAt <= project.phaseA.clips.length;
    if (shiftsLaterClips && isProjectBusy(project)) {
      return { ok: false, error: "片段還在生成，請完成後再插入片段" };
    }
    if (shiftsLaterClips && isReelBusy(project.reelStatus)) {
      return { ok: false, error: "成片合成中，請完成後再插入片段" };
    }

    const hasBriefOverrides =
      input.skillSlug !== undefined ||
      input.styleId !== undefined ||
      input.characterIds !== undefined ||
      input.productIds !== undefined ||
      input.language !== undefined ||
      input.voiceGender !== undefined ||
      input.speechPace !== undefined ||
      input.sceneTextLanguage !== undefined ||
      input.directorBackgroundId !== undefined ||
      input.backgroundImageUrls !== undefined ||
      input.talkingHeadPoseId !== undefined ||
      input.logoUrl !== undefined;

    let effectiveSkillSlug = project.skillSlug;
    let effectiveSpeechPace = project.speechPace;
    let overrides: ClipDirectorOverrides | undefined;

    if (hasBriefOverrides) {
      const skill = await findSelectableSkill(
        user.clerkUserId,
        input.skillSlug || project.skillSlug,
      );
      if (!skill) return { ok: false, error: "找不到風格" };
      effectiveSkillSlug = behaviorSlug(skill);
      const effectiveStyleId = input.styleId?.trim() || project.styleId || "doodle";
      if (input.styleId !== undefined && !isListedStyleId(effectiveStyleId)) {
        return { ok: false, error: "請選擇視覺風格" };
      }

      const characterIds =
        input.characterIds !== undefined
          ? Array.from(
              new Set(
                input.characterIds.map(String).filter((id) => ObjectId.isValid(id)),
              ),
            )
          : (project.cast ?? []).map((member) => member.characterId.toHexString());
      const skillError = briefSkillError({
        skillSlug: effectiveSkillSlug,
        characterIds,
      });
      if (skillError) return { ok: false, error: skillError };

      const castResult =
        input.characterIds !== undefined
          ? await buildCast(
              user.clerkUserId,
              effectiveStyleId,
              characterIds,
              input.characterSelections ?? {},
            )
          : { ok: true as const, cast: project.cast ?? [] };
      if (!castResult.ok) return castResult;

      const productIds =
        input.productIds !== undefined
          ? Array.from(
              new Set(
                input.productIds.map(String).filter((id) => ObjectId.isValid(id)),
              ),
            )
          : [];
      const productResult =
        input.productIds !== undefined
          ? await buildProducts(user.clerkUserId, productIds)
          : { ok: true as const, products: project.products ?? [] };
      if (!productResult.ok) return productResult;

      const language =
        input.language && isVoLanguage(input.language) ? input.language : project.language;
      const voiceGender =
        castResult.cast[0]?.voice?.gender ??
        (input.voiceGender && isVoiceGender(input.voiceGender)
          ? resolveVoiceGender(input.voiceGender)
          : project.voiceGender);
      const speechPace =
        input.speechPace && isSpeechPace(input.speechPace)
          ? input.speechPace
          : project.speechPace;
      effectiveSpeechPace = speechPace;
      const sceneTextLanguage =
        input.sceneTextLanguage && isSceneTextChoice(input.sceneTextLanguage)
          ? input.sceneTextLanguage
          : project.sceneTextLanguage;
      const sceneTextEnabled =
        sceneTextLanguage !== undefined
          ? sceneTextLanguage === SCENE_TEXT_OFF
            ? false
            : applySkillSceneText(effectiveSkillSlug, true)
          : project.sceneTextEnabled;
      const rawDirectorBg = input.directorBackgroundId?.trim() || "";
      const directorBackgroundId = isValidDirectorBackgroundId(effectiveSkillSlug, rawDirectorBg)
        ? rawDirectorBg
        : defaultDirectorBackgroundId(effectiveSkillSlug);
      const talkingHeadPoseId =
        input.talkingHeadPoseId && isTalkingHeadPoseId(input.talkingHeadPoseId)
          ? input.talkingHeadPoseId
          : undefined;
      const logoUrl =
        isBookendSkill(effectiveSkillSlug) && input.logoUrl?.trim()
          ? input.logoUrl.trim()
          : undefined;

      overrides = {
        skillId: skill._id,
        skillSlug: effectiveSkillSlug,
        styleId: effectiveStyleId,
        ...(input.characterIds !== undefined ? { cast: castResult.cast } : {}),
        ...(input.productIds !== undefined ? { products: productResult.products } : {}),
        ...(language !== undefined ? { language } : {}),
        ...(voiceGender !== undefined ? { voiceGender } : {}),
        ...(speechPace !== undefined ? { speechPace } : {}),
        ...(sceneTextEnabled !== undefined ? { sceneTextEnabled } : {}),
        ...(sceneTextLanguage !== undefined ? { sceneTextLanguage } : {}),
        ...(directorBackgroundId !== undefined ? { directorBackgroundId } : {}),
        ...(input.backgroundImageUrls !== undefined
          ? { backgroundImageUrls: input.backgroundImageUrls }
          : {}),
        ...(talkingHeadPoseId !== undefined ? { talkingHeadPoseId } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      };
    }

    const talkingHead = isTalkingHeadSkill(effectiveSkillSlug);
    const rawContent = String(input?.content ?? "").trim();
    const rawSpokenScript =
      input?.spokenScript !== undefined ? String(input.spokenScript).trim() : undefined;
    const uploadedVoUrl = input?.uploadedVoUrl?.trim() || undefined;
    const uploadedVoDurationSeconds =
      typeof input?.uploadedVoDurationSeconds === "number" &&
      Number.isFinite(input.uploadedVoDurationSeconds) &&
      input.uploadedVoDurationSeconds > 0
        ? input.uploadedVoDurationSeconds
        : undefined;
    const maxContentLength = mode === "full_video" ? FULL_VIDEO_CONTENT_MAX : CONTENT_MAX;

    let content = rawContent;
    let spokenScript = rawSpokenScript;

    if (talkingHead) {
      const spokenText = rawSpokenScript !== undefined ? rawSpokenScript : rawContent;
      if (!spokenText && !uploadedVoUrl) {
        return {
          ok: false,
          error:
            mode === "full_video"
              ? "請輸入角色要讀的講稿，或上傳／錄製 VO 語音。"
              : "請輸入這一段的內容",
        };
      }
      const spokenError = talkingHeadSpokenError(spokenText, effectiveSpeechPace, {
        hasUploadedVo: Boolean(uploadedVoUrl),
      });
      if (spokenError) return { ok: false, error: spokenError };
      if (rawContent.length > maxContentLength) {
        return { ok: false, error: "內容過長" };
      }
      content = rawSpokenScript !== undefined ? rawContent : "";
      spokenScript = spokenText;
    } else {
      if (!content) return { ok: false, error: "請輸入這一段的內容" };
      if (content.length > maxContentLength) return { ok: false, error: "內容過長" };
    }

    const now = new Date();
    const job: ClipAppend = {
      id: randomUUID(),
      content,
      ...(spokenScript !== undefined ? { spokenScript } : {}),
      mode,
      ...(input.durationPreset && isDurationPreset(input.durationPreset)
        ? { durationPreset: input.durationPreset }
        : {}),
      ...(uploadedVoUrl ? { uploadedVoUrl } : {}),
      ...(uploadedVoDurationSeconds ? { uploadedVoDurationSeconds } : {}),
      ...(overrides ? { overrides } : {}),
      insertAt,
      status: "queued",
      createdAt: now,
    };
    const updated = await videos.findOneAndUpdate(
      { _id: project._id, clerkUserId: user.clerkUserId },
      { $push: { clipAppends: job }, $set: { updatedAt: now } },
      { returnDocument: "after" },
    );
    if (!updated) return { ok: false, error: "專案不存在" };
    after(() => {
      void runClipAppendQueue(project._id).catch((error: unknown) => {
        console.error("[clip-append] queue failed", error);
      });
    });
    revalidateVideo(project.projectId?.toHexString());
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "新增片段失敗，請再試一次");
  }
}

// Draft every queued clip for this video. A second caller no-ops while the lease is held.
export async function runClipAppendQueue(videoId: ObjectId) {
  const videos = await videosCollection();
  const token = randomUUID();
  const now = new Date();
  const claimed = await videos.findOneAndUpdate(
    {
      _id: videoId,
      $or: [
        { clipAppendLockUntil: { $exists: false } },
        { clipAppendLockUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        clipAppendLockToken: token,
        clipAppendLockUntil: new Date(now.getTime() + CLIP_APPEND_LEASE_MS),
      },
    },
    { returnDocument: "after" },
  );
  if (!claimed || claimed.clipAppendLockToken !== token) return;
  try {
    await drainClipAppends(videoId, token);
  } finally {
    await videos.updateOne(
      { _id: videoId, clipAppendLockToken: token },
      { $unset: { clipAppendLockToken: "", clipAppendLockUntil: "" } },
    );
  }
}

async function drainClipAppends(videoId: ObjectId, token: string) {
  const videos = await videosCollection();
  for (;;) {
    const project = await videos.findOne({ _id: videoId, clipAppendLockToken: token });
    if (!project?.phaseA) return;
    const clipCount = project.phaseA.clips.length;
    const mediaBusy = isMediaBusy(project);
    const reelBusy = isReelBusy(project.reelStatus);
    const job = nextClipAppend(project.clipAppends ?? [], {
      clipCount,
      mediaBusy,
      reelBusy,
    });
    if (!job) {
      // Drop the lease when the queue is idle. A job that landed in this gap is picked up once.
      const released = await videos.findOneAndUpdate(
        {
          _id: videoId,
          clipAppendLockToken: token,
          $or: [
            { clipAppends: { $exists: false } },
            { clipAppends: { $not: { $elemMatch: { status: { $in: ["queued", "writing"] } } } } },
          ],
        },
        { $unset: { clipAppendLockToken: "", clipAppendLockUntil: "" } },
        { returnDocument: "after" },
      );
      if (released) return;
      const again = await videos.findOne({ _id: videoId, clipAppendLockToken: token });
      if (!again?.phaseA) return;
      const retry = nextClipAppend(again.clipAppends ?? [], {
        clipCount: again.phaseA.clips.length,
        mediaBusy: isMediaBusy(again),
        reelBusy: isReelBusy(again.reelStatus),
      });
      if (!retry) return;
      continue;
    }
    const shiftsLaterClips = job.insertAt <= clipCount;
    // A resumed mid-board insert waits until frames and the reel are idle.
    if (job.status === "writing" && shiftsLaterClips && (mediaBusy || reelBusy)) {
      await videos.updateOne(
        { _id: videoId, clipAppendLockToken: token, "clipAppends.id": job.id },
        { $set: { "clipAppends.$.status": "queued", updatedAt: new Date() } },
      );
      continue;
    }
    const marked = await videos.updateOne(
      {
        _id: videoId,
        clipAppendLockToken: token,
        clipAppends: { $elemMatch: { id: job.id, status: { $in: ["queued", "writing"] } } },
      },
      {
        $set: {
          "clipAppends.$.status": "writing",
          "clipAppends.$.startedAt": new Date(),
          clipAppendLockUntil: new Date(Date.now() + CLIP_APPEND_LEASE_MS),
          updatedAt: new Date(),
        },
      },
    );
    if (marked.matchedCount !== 1) return;
    try {
      await writeQueuedClip(videoId, token, job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "新增片段失敗，請再試一次";
      console.error("[clip-append] write failed", { videoId, error });
      await failClipAppend(videoId, token, job.id, message);
    }
  }
}

async function failClipAppend(videoId: ObjectId, token: string, jobId: string, error: string) {
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: videoId, clipAppendLockToken: token });
  if (!project?.clipAppends) return;
  const now = new Date();
  const next = trimFailedClipAppends(
    project.clipAppends.map((job) =>
      job.id === jobId ? { ...job, status: "failed" as const, error } : job,
    ),
  );
  await videos.updateOne(
    { _id: videoId, clipAppendLockToken: token },
    { $set: { clipAppends: next, updatedAt: now } },
  );
}

// Director writes one queued clip (or full-video Phase A storyboard), then saves it under the same lease.
async function writeQueuedClip(videoId: ObjectId, token: string, jobId: string) {
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: videoId, clipAppendLockToken: token });
  const job = project?.clipAppends?.find((item) => item.id === jobId);
  if (!project?.phaseA || !job) return;

  await hydrateStyles();

  const ov = job.overrides;
  const rawSkillId = ov?.skillId ?? project.skillId;
  const skillId =
    typeof rawSkillId === "string" && ObjectId.isValid(rawSkillId)
      ? new ObjectId(rawSkillId)
      : (rawSkillId as ObjectId);
  const skillSlug = ov?.skillSlug ?? project.skillSlug;
  const styleId = ov?.styleId ?? project.styleId;
  const cast = ov?.cast ?? project.cast;
  const products = ov?.products ?? project.products;
  const language = ov?.language ?? project.language;
  const narrationEnabled = ov?.narrationEnabled ?? project.narrationEnabled;
  const voiceGender = ov?.voiceGender ?? project.voiceGender;
  const speechPace = ov?.speechPace ?? project.speechPace;
  const sceneTextEnabled = ov?.sceneTextEnabled ?? project.sceneTextEnabled;
  const sceneTextLanguage = ov?.sceneTextLanguage ?? project.sceneTextLanguage;
  const directorBackgroundId = ov?.directorBackgroundId ?? project.directorBackgroundId;
  const backgroundImageUrls = ov?.backgroundImageUrls ?? project.backgroundImageUrls;
  const talkingHeadBackgroundId = ov?.talkingHeadBackgroundId ?? project.talkingHeadBackgroundId;
  const talkingHeadPoseId = ov?.talkingHeadPoseId ?? project.talkingHeadPoseId;
  const logoUrl = ov?.logoUrl ?? project.logoUrl;

  const foundSkill = await loadStoredSkill(skillId);
  const skill = foundSkill
    ? await resolveRunSkill(foundSkill).catch((error: unknown) => {
        if (error instanceof MissingTemplateError) return null;
        throw error;
      })
    : null;
  if (!skill) throw new Error("找不到導演");

  const style = await loadRenderableStyle({
    styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const plateOverlay = usesTalkingHeadSubtitleOverlay({
    skillSlug: skill.slug,
    styleId: style.id,
    baseStyleId: style.baseStyleId,
  });
  const talkingHead = isTalkingHeadSkill(skill.slug);

  let rawDrafted: StoryboardRow[];
  if (job.mode === "full_video") {
    let phaseA = await runPhaseA({
      skill,
      style,
      source: job.content,
      spokenScript:
        job.spokenScript !== undefined
          ? job.spokenScript
          : talkingHead && !job.uploadedVoUrl
            ? job.content
            : project.spokenScript,
      aspectRatio: project.aspectRatio,
      durationPreset: job.durationPreset || "auto",
      language,
      narrationEnabled,
      voiceGender,
      speechPace,
      sceneTextEnabled,
      sceneTextLanguage,
      subtitleLook: project.subtitleLook,
      textStyleImageUrl: project.textStyleImageUrl,
      characterImageUrl: project.characterImageUrl,
      cast: await withCurrentCharacterVoices(cast),
      products,
      logoUrl,
      referenceImages: project.referenceImages,
      backgroundImageUrls,
      directorBackgroundId,
      talkingHeadBackgroundId,
      talkingHeadPoseId,
      startImageUrl: project.startImageUrl,
      uploadedVoUrl: job.uploadedVoUrl,
      uploadedVoDurationSeconds: job.uploadedVoDurationSeconds,
    });
    if (isOutfitReelSkill(skillSlug)) {
      phaseA = sanitizeOutfitPhaseA(phaseA, Math.random, {
        lenses: isRealisticStyle(style),
      });
    }
    if (isOutfitChangeSkill(skillSlug)) {
      phaseA = sanitizeOutfitChangePhaseA(phaseA);
    }
    if (isSurpriseInterviewSkill(skillSlug)) {
      phaseA = sanitizeSurprisePhaseA(phaseA);
    }
    rawDrafted = phaseA.clips;
  } else {
    const shareContinuity =
      job.insertAt > 1
        ? clipsShareContinuity(
            {
              ...project,
              phaseA: {
                ...project.phaseA,
                clips: [
                  ...project.phaseA.clips,
                  attachClipOverrides({ clipNumber: 0 } as StoryboardRow, job.overrides),
                ],
              },
            },
            job.insertAt - 1,
            0,
          )
        : false;
    const draftedSingle = await draftAppendedClips({
      skill,
      style,
      language,
      speechPace,
      aspectRatio: project.aspectRatio,
      source: talkingHead ? job.content || project.source : project.source,
      spokenScript: job.spokenScript ?? project.spokenScript,
      phaseA: project.phaseA,
      referenceImages: project.referenceImages,
      backgroundImageUrls,
      talkingHeadBackgroundId,
      talkingHeadPoseId,
      startImageUrl: project.startImageUrl,
      uploadedVoUrl: job.uploadedVoUrl,
      uploadedVoDurationSeconds: job.uploadedVoDurationSeconds,
      cast,
      content: talkingHead
        ? job.spokenScript !== undefined
          ? job.spokenScript
          : job.content
        : job.content,
      insertAt: job.insertAt,
      subtitleOverlay: plateOverlay,
      noText: !resolveSceneText({
        skillSlug,
        sceneTextEnabled,
        sceneTextLanguage,
      }).enabled,
      shareContinuity,
    });
    rawDrafted = draftedSingle.slice(0, 1);
  }
  if (rawDrafted.length === 0) throw new Error("導演沒有寫出片段");

  const fresh = await videos.findOne({ _id: videoId, clipAppendLockToken: token });
  if (!fresh?.phaseA) return;
  const insertAt =
    job.mode === "full_video" ? fresh.phaseA.clips.length + 1 : job.insertAt;
  const drafted =
    job.mode === "full_video"
      ? rawDrafted.slice(0, Math.max(1, APPEND_CLIP_MAX - fresh.phaseA.clips.length))
      : rawDrafted;
  if (fresh.phaseA.clips.length + drafted.length > APPEND_CLIP_MAX) {
    throw new Error(`最多 ${APPEND_CLIP_MAX} 段`);
  }
  if (!Number.isInteger(insertAt) || insertAt < 1 || insertAt > fresh.phaseA.clips.length + 1) {
    throw new Error("插入位置不正確");
  }
  if (plateOverlay) {
    const users = await usersCollection();
    const account = await users.findOne({ clerkUserId: fresh.clerkUserId });
    if (!account) throw new Error("專案不存在");
    await assertCanSpendCredits(withUnlimitedCredits(account), FRAME_COST * drafted.length);
  }

  const draftedWithOverrides = drafted.map((row) => attachClipOverrides(row, job.overrides));
  const inserted = insertClips(fresh, draftedWithOverrides, insertAt, {
    language,
    talkingHead,
  });
  if (!inserted.ok) throw new Error(inserted.error);
  const now = new Date();
  const shiftsLaterClips = insertAt <= fresh.phaseA.clips.length;
  const appendedSpoken = job.spokenScript !== undefined ? job.spokenScript : job.content;
  const wrote = await videos.updateOne(
    { _id: fresh._id, clerkUserId: fresh.clerkUserId, clipAppendLockToken: token },
    {
      $set: {
        phaseA: inserted.project.phaseA,
        clips: inserted.project.clips,
        frames: inserted.project.frames ?? [],
        ...(Array.isArray(inserted.project.subtitlePlates)
          ? { subtitlePlates: inserted.project.subtitlePlates }
          : {}),
        ...(Array.isArray(inserted.project.sceneChats) ? { sceneChats: inserted.project.sceneChats } : {}),
        ...(Array.isArray(inserted.project.backgroundPlates)
          ? { backgroundPlates: inserted.project.backgroundPlates }
          : {}),
        ...(inserted.project.phaseB ? { phaseB: inserted.project.phaseB } : {}),
        ...(Array.isArray(inserted.project.autoVideoClips)
          ? { autoVideoClips: inserted.project.autoVideoClips }
          : {}),
        ...(inserted.project.edit ? { edit: inserted.project.edit } : {}),
        ...(talkingHead && isTalkingHeadSkill(fresh.skillSlug)
          ? { spokenScript: [fresh.spokenScript?.trim(), appendedSpoken].filter(Boolean).join("\n") }
          : {}),
        clipAppends: shiftPendingInserts(fresh.clipAppends ?? [], jobId, insertAt, draftedWithOverrides.length),
        updatedAt: now,
      },
      $unset: {
        reelUrl: "",
        reelStatus: "",
        reelFingerprint: "",
        reelError: "",
        reelStep: "",
        reelAttempts: "",
      },
    },
  );
  if (wrote.matchedCount !== 1) throw new Error("專案不存在");
  if (shiftsLaterClips) await shiftInsertedClipJobs(fresh._id, insertAt, draftedWithOverrides.length);
  const newNumbers = draftedWithOverrides.map((_, index) => insertAt + index);
  if (plateOverlay) {
    await queueNewClipPlates(fresh.clerkUserId, fresh._id, newNumbers);
  }
  if (isProductionLike(fresh.status)) {
    await queueNewClipFrames(fresh.clerkUserId, fresh._id, newNumbers);
  }
  revalidateVideo(fresh.projectId?.toHexString());
}

// Automatically charge and enqueue scene frame jobs for newly appended clips so background generation
// starts immediately without waiting for the user to refresh the editor page.
async function queueNewClipFrames(
  clerkUserId: string,
  videoId: ObjectId,
  clipNumbers: number[],
) {
  let spendKey: string | undefined;
  let chargedCost = 0;
  try {
    const [videos, users] = await Promise.all([
      videosCollection(),
      usersCollection(),
    ]);
    const [saved, account] = await Promise.all([
      videos.findOne({ _id: videoId }),
      users.findOne({ clerkUserId }),
    ]);
    if (!saved?.phaseA || !account) return;
    if (await stillBlocker(saved)) return;

    const cost = clipNumbers.reduce(
      (sum, clipNumber) => sum + clipFrameCost(saved, clipNumber),
      0,
    );
    if (cost <= 0) return;

    await assertCanSpendCredits(withUnlimitedCredits(account), cost);
    spendKey = await consumeCredits(clerkUserId, cost);
    chargedCost = cost;

    await enqueueClipFrameJobs(saved, clipNumbers);
  } catch (error) {
    console.error("[clip-append] new clip frame enqueue failed", { videoId, error });
    if (spendKey && chargedCost > 0) {
      await refundCredits(clerkUserId, chargedCost, spendKey).catch(() => {});
    }
  }
}

// Charge and queue plates for the clips just added. The clips are already saved, so a
// failure refunds those credits and leaves no plate: export stays blocked and the studio's
// retry button is the way to recover.
async function queueNewClipPlates(clerkUserId: string, videoId: ObjectId, clipNumbers: number[]) {
  const cost = FRAME_COST * clipNumbers.length;
  let spendKey: string | undefined;
  try {
    spendKey = await consumeCredits(clerkUserId, cost);
  } catch (error) {
    console.error("[subtitle-plate] new clip charge failed", { videoId, error });
    return;
  }
  try {
    const videos = await videosCollection();
    const saved = await videos.findOne({ _id: videoId });
    if (!saved) throw new Error("專案不存在");
    await enqueueSubtitlePlateJobs(saved, clipNumbers);
  } catch (error) {
    console.error("[subtitle-plate] new clip enqueue failed", { videoId, error });
    await refundCredits(clerkUserId, cost, spendKey);
  }
}

// Persist a filmstrip drag. `order` is the previous clip numbers in the new order.
export async function reorderClipsAction(videoId: string, order: number[]): Promise<TimelineResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId) || !Array.isArray(order)) {
      return { ok: false, error: "專案不存在" };
    }
    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (isProjectBusy(project)) return { ok: false, error: "片段還在生成，請完成後再調整順序" };

    const next = applyClipOrder(project, order);
    if (!next.ok) return next;
    const now = new Date();
    const wrote = await videos.updateOne(
      { _id: project._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          phaseA: next.project.phaseA,
          clips: next.project.clips,
          frames: next.project.frames ?? [],
          ...(Array.isArray(next.project.subtitlePlates)
            ? { subtitlePlates: next.project.subtitlePlates }
            : {}),
          ...(next.project.sceneChats ? { sceneChats: next.project.sceneChats } : {}),
          ...(next.project.backgroundPlates ? { backgroundPlates: next.project.backgroundPlates } : {}),
          ...(next.project.phaseB ? { phaseB: next.project.phaseB } : {}),
          ...(next.project.autoVideoClips ? { autoVideoClips: next.project.autoVideoClips } : {}),
          ...(next.project.edit ? { edit: next.project.edit } : {}),
          updatedAt: now,
        },
      },
    );
    if (wrote.matchedCount !== 1) return { ok: false, error: "專案不存在" };
    const updated = await videos.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(project.projectId?.toHexString());
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "調整順序失敗，請再試一次");
  }
}

// Remove one clip, its frames and video, then renumber the clips after it.
export async function deleteClipAction(videoId: string, clipNumber: number): Promise<TimelineResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId) || !Number.isInteger(clipNumber) || clipNumber < 1) {
      return { ok: false, error: "專案不存在" };
    }
    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (isProjectBusy(project)) return { ok: false, error: "片段還在生成，請完成後再刪除" };
    if (isReelBusy(project.reelStatus)) return { ok: false, error: "成片合成中，請完成後再刪除" };

    const next = removeClip(project, clipNumber, { language: project.language });
    if (!next.ok) return next;
    const now = new Date();
    const wrote = await videos.updateOne(
      { _id: project._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          phaseA: next.project.phaseA,
          clips: next.project.clips,
          frames: next.project.frames ?? [],
          ...(Array.isArray(next.project.subtitlePlates)
            ? { subtitlePlates: next.project.subtitlePlates }
            : {}),
          ...(Array.isArray(next.project.sceneChats) ? { sceneChats: next.project.sceneChats } : {}),
          ...(Array.isArray(next.project.backgroundPlates)
            ? { backgroundPlates: next.project.backgroundPlates }
            : {}),
          ...(next.project.phaseB ? { phaseB: next.project.phaseB } : {}),
          ...(Array.isArray(next.project.autoVideoClips) ? { autoVideoClips: next.project.autoVideoClips } : {}),
          ...(next.project.edit ? { edit: next.project.edit } : {}),
          updatedAt: now,
        },
        $unset: {
          reelUrl: "",
          reelStatus: "",
          reelFingerprint: "",
          reelError: "",
          reelStep: "",
          reelAttempts: "",
        },
      },
    );
    if (wrote.matchedCount !== 1) return { ok: false, error: "專案不存在" };
    await shiftDeletedClipJobs(project, clipNumber);
    const updated = await videos.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(project.projectId?.toHexString());
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "刪除片段失敗，請再試一次");
  }
}

// Jobs for clips at and after the insert slot move forward with those clips.
async function shiftInsertedClipJobs(videoId: ObjectId, insertAt: number, added: number) {
  const jobs = await generationJobsCollection();
  await jobs.updateMany(
    {
      projectId: videoId,
      kind: { $in: ["frame", "video", "subtitlePlate"] as const },
      clipIndex: { $gte: insertAt - 1 },
    },
    { $inc: { clipIndex: added } },
  );
}

// Finished jobs stay labeled with the clip they belong to after the gap closes.
async function shiftDeletedClipJobs(
  project: Parameters<typeof collectClipVideoBlobUrls>[0] & {
    _id: ObjectId;
    frames?: Parameters<typeof collectFrameBlobUrls>[0];
    subtitlePlates?: Parameters<typeof collectSubtitlePlateBlobUrls>[0]["subtitlePlates"];
  },
  clipNumber: number,
) {
  const removedIndex = clipNumber - 1;
  const jobs = await generationJobsCollection();
  const clipJobs = {
    projectId: project._id,
    kind: { $in: ["frame", "video", "subtitlePlate"] as const },
  };
  const removedJobs = await jobs.find({ ...clipJobs, clipIndex: removedIndex }).toArray();
  const oldUrls = [
    ...collectFrameBlobUrls(project.frames, [{ clipNumber }], removedJobs),
    ...collectClipVideoBlobUrls(project, [clipNumber], removedJobs),
    ...collectSubtitlePlateBlobUrls(project, [clipNumber], removedJobs),
  ];
  await Promise.all([
    jobs.deleteMany({ ...clipJobs, clipIndex: removedIndex }),
    deleteExplainerBlobUrls(oldUrls),
  ]);
  await jobs.updateMany(
    { ...clipJobs, clipIndex: { $gt: removedIndex } },
    { $inc: { clipIndex: -1 } },
  );
}
