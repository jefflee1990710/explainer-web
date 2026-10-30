import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { generationJobsCollection, usersCollection, videosCollection } from "@/dao";
import type { ClipAppend } from "@/model/project";
import {
  CLIP_APPEND_LEASE_MS,
  nextClipAppend,
  shiftPendingInserts,
  trimFailedClipAppends,
} from "@/service/clip/clip-append";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  getActiveSubscription,
  isSubscriptionActive,
  refundCredits,
} from "@/service/billing/credits";
import { withUnlimitedCredits } from "@/service/billing/unlimited-credits";
import { FRAME_COST } from "@/service/credit-costs";
import { enqueueSubtitlePlateJobs } from "@/service/higgsfield/subtitle-plate-job";
import { usesTalkingHeadSubtitleOverlay } from "@/service/director/subtitle-plate";
import { resolveSceneText } from "@/service/director/scene-text";
import {
  applyClipOrder,
  insertClips,
  removeClip,
} from "@/service/clip/clip-order";
import { APPEND_CLIP_MAX, draftAppendedClips } from "@/service/director/append-clip";
import { loadStoredSkill } from "@/service/director/load-skill";
import { isTalkingHeadSkill, talkingHeadSpokenError } from "@/service/director/talking-head";
import { isMediaBusy, isProjectBusy } from "@/service/clip-stage";
import { isReelBusy } from "@/service/reel/fingerprint";
import { isProductionLike } from "@/service/project-status";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import {
  collectClipVideoBlobUrls,
  collectFrameBlobUrls,
  collectSubtitlePlateBlobUrls,
} from "@/service/video/storage";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";

const CONTENT_MAX = 2000;

type TimelineResult = { ok: true; project: PublicVideo } | { ok: false; error: string };

function revalidateVideo(projectId?: string) {
  revalidatePath("/app");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

function fail(error: unknown, fallback: string): TimelineResult {
  console.error(fallback, error);
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// Queue a director write and return. The clip shows up when the background job finishes.
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
    const pending = (project.clipAppends ?? []).filter((job) => job.status !== "failed").length;
    if (project.phaseA.clips.length + pending >= APPEND_CLIP_MAX) {
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

    const now = new Date();
    const job: ClipAppend = {
      id: randomUUID(),
      content,
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

// Director writes one queued clip, then saves it under the same lease.
async function writeQueuedClip(videoId: ObjectId, token: string, jobId: string) {
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: videoId, clipAppendLockToken: token });
  const job = project?.clipAppends?.find((item) => item.id === jobId);
  if (!project?.phaseA || !job) return;

  const plateOverlay = usesTalkingHeadSubtitleOverlay({
    skillSlug: project.skillSlug,
    styleId: project.styleId,
  });
  const talkingHead = isTalkingHeadSkill(project.skillSlug);
  const skill = await loadStoredSkill(project.skillId);
  if (!skill) throw new Error("找不到導演");
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const insertAt = job.insertAt;
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
    talkingHeadBackgroundId: project.talkingHeadBackgroundId,
    talkingHeadPoseId: project.talkingHeadPoseId,
    startImageUrl: project.startImageUrl,
    cast: project.cast,
    content: job.content,
    insertAt,
    subtitleOverlay: plateOverlay,
    noText: !resolveSceneText(project).enabled,
  });
  if (drafted.length === 0) throw new Error("導演沒有寫出片段");

  const fresh = await videos.findOne({ _id: videoId, clipAppendLockToken: token });
  if (!fresh?.phaseA) return;
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

  const inserted = insertClips(fresh, drafted, insertAt, {
    language: fresh.language,
    talkingHead,
  });
  if (!inserted.ok) throw new Error(inserted.error);
  const now = new Date();
  const shiftsLaterClips = insertAt <= fresh.phaseA.clips.length;
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
        ...(talkingHead
          ? { spokenScript: [fresh.spokenScript?.trim(), job.content].filter(Boolean).join("\n") }
          : {}),
        clipAppends: shiftPendingInserts(fresh.clipAppends ?? [], jobId, insertAt, drafted.length),
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
  if (shiftsLaterClips) await shiftInsertedClipJobs(fresh._id, insertAt, drafted.length);
  if (plateOverlay) {
    const newNumbers = drafted.map((_, index) => insertAt + index);
    await queueNewClipPlates(fresh.clerkUserId, fresh._id, newNumbers);
  }
  revalidateVideo(fresh.projectId?.toHexString());
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
