import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { generationJobsCollection, videosCollection } from "@/dao";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import {
  applyClipOrder,
  insertClips,
  removeClip,
} from "@/service/clip/clip-order";
import { APPEND_CLIP_MAX, draftAppendedClips } from "@/service/director/append-clip";
import { loadStoredSkill } from "@/service/director/load-skill";
import { isTalkingHeadSkill, talkingHeadSpokenError } from "@/service/director/talking-head";
import { isProjectBusy } from "@/service/clip-stage";
import { isReelBusy } from "@/service/reel/fingerprint";
import { isProductionLike } from "@/service/project-status";
import { loadRenderableStyle } from "@/service/style/renderable-style";

const CONTENT_MAX = 2000;

type TimelineResult = { ok: true; project: PublicVideo } | { ok: false; error: string };

function revalidateVideo(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
}

function fail(error: unknown, fallback: string): TimelineResult {
  console.error(fallback, error);
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// Director writes one new clip and appends it after the current last clip.
export async function appendDirectorClipAction(input: {
  videoId: string;
  content: string;
  // 1-based slot. Omit to add after the last clip.
  insertAt?: number;
}): Promise<TimelineResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(input?.videoId ?? "");
    const content = String(input?.content ?? "").trim();
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
    if (!content) return { ok: false, error: "請輸入這一段的內容" };
    if (content.length > CONTENT_MAX) return { ok: false, error: "內容過長" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能新增片段" };

    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) return { ok: false, error: "分鏡尚未完成" };
    if (project.phaseA.clips.length >= APPEND_CLIP_MAX) {
      return { ok: false, error: `最多 ${APPEND_CLIP_MAX} 段` };
    }
    const insertAt = input.insertAt ?? project.phaseA.clips.length + 1;
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

    const talkingHead = isTalkingHeadSkill(project.skillSlug);
    if (talkingHead) {
      const spokenError = talkingHeadSpokenError(content, project.speechPace);
      if (spokenError) return { ok: false, error: spokenError };
    }

    const skill = await loadStoredSkill(project.skillId);
    if (!skill) return { ok: false, error: "找不到導演" };
    const style = await loadRenderableStyle({
      styleId: project.styleId,
      ownerClerkUserId: project.clerkUserId,
    });

    const drafted = await draftAppendedClips({
      skill,
      style,
      language: project.language,
      speechPace: project.speechPace,
      aspectRatio: project.aspectRatio,
      source: project.source,
      spokenScript: project.spokenScript,
      phaseA: project.phaseA,
      referenceImages: project.referenceImages,
      backgroundImageUrls: project.backgroundImageUrls,
      cast: project.cast,
      content,
      insertAt,
    });
    if (drafted.length === 0) return { ok: false, error: "導演沒有寫出片段" };
    if (project.phaseA.clips.length + drafted.length > APPEND_CLIP_MAX) {
      return { ok: false, error: `最多 ${APPEND_CLIP_MAX} 段` };
    }

    const inserted = insertClips(project, drafted, insertAt, {
      language: project.language,
      talkingHead,
    });
    if (!inserted.ok) return inserted;
    const now = new Date();
    const wrote = await videos.updateOne(
      { _id: project._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          phaseA: inserted.project.phaseA,
          clips: inserted.project.clips,
          frames: inserted.project.frames ?? [],
          ...(Array.isArray(inserted.project.sceneChats) ? { sceneChats: inserted.project.sceneChats } : {}),
          ...(Array.isArray(inserted.project.backgroundPlates)
            ? { backgroundPlates: inserted.project.backgroundPlates }
            : {}),
          ...(inserted.project.phaseB ? { phaseB: inserted.project.phaseB } : {}),
          ...(Array.isArray(inserted.project.autoVideoClips)
            ? { autoVideoClips: inserted.project.autoVideoClips }
            : {}),
          ...(inserted.project.edit ? { edit: inserted.project.edit } : {}),
          ...(talkingHead
            ? { spokenScript: [project.spokenScript?.trim(), content].filter(Boolean).join("\n") }
            : {}),
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
    if (shiftsLaterClips) await shiftInsertedClipJobs(project._id, insertAt, drafted.length);
    const updated = await videos.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(String(project.projectId));
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "新增片段失敗，請再試一次");
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
    revalidateVideo(String(project.projectId));
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
    await shiftDeletedClipJobs(project._id, clipNumber);
    const updated = await videos.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(String(project.projectId));
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
      kind: { $in: ["frame", "video"] as const },
      clipIndex: { $gte: insertAt - 1 },
    },
    { $inc: { clipIndex: added } },
  );
}

// Finished jobs stay labeled with the clip they belong to after the gap closes.
async function shiftDeletedClipJobs(videoId: ObjectId, clipNumber: number) {
  const removedIndex = clipNumber - 1;
  const jobs = await generationJobsCollection();
  const clipJobs = { projectId: videoId, kind: { $in: ["frame", "video"] as const } };
  await jobs.deleteMany({ ...clipJobs, clipIndex: removedIndex });
  await jobs.updateMany(
    { ...clipJobs, clipIndex: { $gt: removedIndex } },
    { $inc: { clipIndex: -1 } },
  );
}
