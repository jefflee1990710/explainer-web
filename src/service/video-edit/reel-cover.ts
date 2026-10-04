import { ObjectId, type Filter } from "mongodb";
import { videosCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { CoverStatus, Project } from "@/model/project";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { toSent } from "@/service/generation/sent";
import { submitImage } from "@/service/higgsfield/generate";
import { persistMedia } from "@/service/higgsfield/persist";
import { FRAME_COST } from "@/service/production-plan";
import { resolveSceneText } from "@/service/director/scene-text";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { styleLetteringLine, styleLinesForFrame } from "@/service/style/prompts";
import { captionBrief } from "@/service/video-share/caption-brief";
import { coverSafeAreaPrompt, parseCoverSafeAreas } from "@/service/video-edit/cover-safe-area";
import type { CoverSafeArea } from "@/model/project";
import { mediaSrc } from "@/util/media-src";
import { toPublicVideo } from "@/presentation/serialize";

const COVER_IN_FLIGHT_MS = 15 * 60 * 1000;
export const COVER_PROMPT_MAX = 500;

export type GenerateReelCoverResult =
  | { ok: true; project: ReturnType<typeof toPublicVideo> }
  | { ok: false; error: string };

type CoverFlight = { coverStatus?: CoverStatus; coverStartedAt?: Date };

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

export function parseCoverPrompt(raw: unknown): { ok: true; prompt: string } | { ok: false; error: string } {
  const prompt = typeof raw === "string" ? raw.trim() : "";
  if (prompt.length > COVER_PROMPT_MAX) return { ok: false, error: "封面補充需求最多 500 字" };
  return { ok: true, prompt };
}

// Title, message, hook, and clip lines plus the video's visual style.
export function reelCoverPrompt(project: Project): string {
  const brief = captionBrief({ source: project.source, phaseA: project.phaseA });
  const extra = project.coverPrompt?.trim() ?? "";
  const safeArea = coverSafeAreaPrompt(project.coverSafeAreas);
  return [
    "Single cover still for a finished explainer reel.",
    "No device chrome, no play button, no UI mockup.",
    `Aspect ratio ${project.aspectRatio}.`,
    brief,
    safeArea,
    extra ? `Extra requirement: ${extra}` : "",
  ]
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

export function reelCoverInFlight(doc: CoverFlight, now: Date): boolean {
  if (doc.coverStatus !== "generating" || !doc.coverStartedAt) return false;
  return now.getTime() - doc.coverStartedAt.getTime() < COVER_IN_FLIGHT_MS;
}

// Video-tab poller: cover jobs live in generationJobs, same as frames.
export function isCoverRunning(project: { coverStatus?: CoverStatus }) {
  return project.coverStatus === "generating";
}

function coverClaimFilter(input: { videoId: ObjectId; clerkUserId: string; now: Date }): Filter<Project> {
  const staleAt = new Date(input.now.getTime() - COVER_IN_FLIGHT_MS);
  return {
    _id: input.videoId,
    clerkUserId: input.clerkUserId,
    $or: [
      { coverStatus: { $ne: "generating" } },
      { coverStartedAt: { $exists: false } },
      { coverStartedAt: { $lte: staleAt } },
    ],
  };
}

function ownedCoverFilter(videoId: ObjectId, clerkUserId: string, coverStartedAt: Date) {
  return { _id: videoId, clerkUserId, coverStartedAt };
}

async function claimCoverRefund(videoId: ObjectId, clerkUserId: string, coverStartedAt: Date) {
  const videos = await videosCollection();
  const claimed = await videos.updateOne(
    { ...ownedCoverFilter(videoId, clerkUserId, coverStartedAt), coverCreditsCharged: true },
    {
      $set: {
        coverStatus: "failed",
        coverCreditsCharged: false,
        updatedAt: new Date(),
      },
    },
  );
  if (claimed.matchedCount !== 1) return;
  try {
    await refundCredits(clerkUserId, FRAME_COST);
  } catch (error) {
    await videos.updateOne(ownedCoverFilter(videoId, clerkUserId, coverStartedAt), {
      $set: { coverCreditsCharged: true, updatedAt: new Date() },
    });
    throw error;
  }
}

// Claim the slot, charge once, then queue a reelCover still.
export async function generateReelCoverAction(
  videoId: string,
  extraPrompt?: string,
  safeAreas?: CoverSafeArea[],
): Promise<GenerateReelCoverResult> {
  let spendKey: string | undefined;
  let jobQueued = false;
  let id: ObjectId | undefined;
  let coverStartedAt: Date | undefined;
  let ownerClerkUserId = "";

  try {
    const user = await requireAppUser();
    ownerClerkUserId = user.clerkUserId;
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "找不到影片" };

    const videos = await videosCollection();
    const video = await videos.findOne({ _id: new ObjectId(videoId), clerkUserId: user.clerkUserId });
    if (!video) return { ok: false, error: "找不到影片" };
    if (!video.phaseA) return { ok: false, error: "還沒有分鏡內容，無法產生封面" };

    const parsed = parseCoverPrompt(extraPrompt);
    if (!parsed.ok) return parsed;
    const safe = parseCoverSafeAreas(safeAreas);
    if (!safe.ok) return safe;

    const now = new Date();
    id = video._id;
    coverStartedAt = now;
    const unset: Record<string, ""> = {};
    if (!parsed.prompt) unset.coverPrompt = "";
    if (safe.areas.length === 0) unset.coverSafeAreas = "";
    const claimed = await videos.updateOne(coverClaimFilter({ videoId: video._id, clerkUserId: user.clerkUserId, now }), {
      $set: {
        coverStatus: "generating",
        coverStartedAt: now,
        updatedAt: now,
        ...(parsed.prompt ? { coverPrompt: parsed.prompt } : {}),
        ...(safe.areas.length ? { coverSafeAreas: safe.areas } : {}),
      },
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    });
    if (claimed.matchedCount !== 1) return { ok: false, error: "封面生成中" };

    try {
      await assertCanSpendCredits(user, FRAME_COST);
      spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
    } catch (error) {
      await videos.updateOne(ownedCoverFilter(video._id, user.clerkUserId, now), {
        $set: { coverStatus: "idle", updatedAt: new Date() },
      });
      return fail(error, "封面生成失敗");
    }

    const charged = await videos.updateOne(ownedCoverFilter(video._id, user.clerkUserId, now), {
      $set: { coverCreditsCharged: true, updatedAt: new Date() },
    });
    if (charged.matchedCount !== 1) return { ok: false, error: "封面生成中" };

    let jobId: ObjectId;
    try {
      const sceneText = resolveSceneText(video);
      jobId = await insertPendingJob({
        kind: "reelCover",
        projectId: video._id,
        clipIndex: 0,
        model: IMAGE_ROUTE_BY_SCENE_TEXT[sceneText.language].model,
      });
    } catch (error) {
      await videos.updateOne(ownedCoverFilter(video._id, user.clerkUserId, now), {
        $set: { coverStatus: "idle", coverCreditsCharged: false, updatedAt: new Date() },
      });
      if (spendKey) await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
      return fail(error, "封面排隊失敗");
    }
    jobQueued = true;
    kickJob(jobId);

    const updated = await videos.findOne({ _id: video._id });
    return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
  } catch (error) {
    if (spendKey && !jobQueued && id && coverStartedAt) {
      try {
        await claimCoverRefund(id, ownerClerkUserId, coverStartedAt);
      } catch (refundError) {
        return fail(refundError, "封面排隊失敗");
      }
    }
    return fail(error, "封面生成失敗");
  }
}

export async function sendReelCover(project: Project) {
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const sceneText = resolveSceneText(project);
  const startFrame = project.frames?.find((frame) => frame.position === "start" && (frame.blobUrl || frame.outputUrl));
  const model = IMAGE_ROUTE_BY_SCENE_TEXT[sceneText.language].model;
  const submitted = await submitImage({
    model,
    prompt: [
      ...styleLinesForFrame(style),
      styleLetteringLine(style),
      reelCoverPrompt(project),
    ].join("\n"),
    aspectRatio: project.aspectRatio,
    quality: "medium",
    resolution: "1k",
    sceneTextLanguage: sceneText.language,
    referenceImageUrls: startFrame ? [mediaSrc(startFrame)].filter(Boolean) : undefined,
  });
  return toSent(model, submitted);
}

function isCurrentCover(doc: { coverStartedAt?: Date }, job: GenerationJob) {
  if (!doc.coverStartedAt) return true;
  return doc.coverStartedAt.getTime() <= job.createdAt.getTime();
}

// Write the finished still onto the video, or refund this attempt once.
export async function syncReelCoverJob(job: GenerationJob, status: GenerationStatus, outputUrl?: string) {
  if (!job.projectId) return;
  const videos = await videosCollection();
  const doc = await videos.findOne({ _id: job.projectId });
  if (!doc?.coverStartedAt || !isCurrentCover(doc, job)) return;
  const startedAt = doc.coverStartedAt;

  if (status === "completed" && outputUrl) {
    const stored = await persistMedia(
      outputUrl,
      `explainer/reel-covers/${doc._id.toHexString()}/${job._id.toHexString()}`,
    );
    await videos.updateOne(ownedCoverFilter(doc._id, doc.clerkUserId, startedAt), {
      $set: {
        coverUrl: stored,
        coverStatus: "idle",
        coverCreditsCharged: false,
        updatedAt: new Date(),
      },
    });
    return;
  }

  if (status === "failed" || status === "nsfw") {
    await claimCoverRefund(doc._id, doc.clerkUserId, startedAt);
  }
}
