import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { Project, ProjectClip } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { markUnsentClipVideos } from "@/service/clip/cancel-pending-video";
import { folderVideoPath } from "@/service/folder-video-path";
import { startScroSwapJob } from "@/service/jutsu/pipeline";
import { startTeleportJob } from "@/service/teleport/pipeline";
import { mediaSrc } from "@/util/media-src";

export type ApplyClipEngineResult =
  | { ok: true; project: PublicVideo; jobId: string }
  | { ok: false; error: string };

/** Clamp storyboard clip duration to the 2..15s range supported by Scro Swap and Teleport. */
export function resolveClipJutsuSectionLength(
  rowSeconds?: number,
  clipSeconds?: number,
): number {
  const raw = Number(rowSeconds) || Number(clipSeconds) || 6;
  return Math.min(15, Math.max(2, Math.round(raw)));
}

/**
 * Flip the target clip to `in_progress` with a fresh `submittedAt` timestamp.
 * Using `in_progress` (not `queued`) prevents `orphanQueuedClips` from failing it,
 * and the fresh `submittedAt` prevents `reconcileClips` from applying older video jobs.
 */
export function markClipInProgressForEngine(
  clips: ProjectClip[],
  clipNumber: number,
  nowIso: string,
): ProjectClip[] {
  return clips.map((clip) =>
    clip.clipNumber === clipNumber
      ? {
          ...clip,
          status: "in_progress" as const,
          submittedAt: nowIso,
          error: undefined,
          unsent: false,
        }
      : clip,
  );
}

async function loadReadyClip(
  videoId: string,
  clipNumber: number,
  clerkUserId: string,
): Promise<
  | {
      ok: true;
      project: Project;
      sourceVideoUrl: string;
      sectionLength: number;
    }
  | { ok: false; error: string }
> {
  if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
  if (!project?.phaseA) return { ok: false, error: "專案不存在" };

  const row = project.phaseA.clips.find((item) => item.clipNumber === clipNumber);
  if (!row) return { ok: false, error: "找不到這段分鏡" };

  const clip = (project.clips || []).find((item) => item.clipNumber === clipNumber);
  if (!clip) return { ok: false, error: "這段分鏡尚未產生影片" };
  if (clip.status === "queued" || clip.status === "in_progress") {
    return { ok: false, error: "這一段影片正在產生中，請稍候" };
  }
  const sourceVideoUrl = mediaSrc(clip)?.trim() || "";
  if (clip.status !== "completed" || !sourceVideoUrl.startsWith("https://")) {
    return { ok: false, error: "這段分鏡尚未產生完成的影片" };
  }

  return {
    ok: true,
    project,
    sourceVideoUrl,
    sectionLength: resolveClipJutsuSectionLength(row.durationSeconds, clip.durationSeconds),
  };
}

async function persistClipInProgress(
  project: Project,
  clipNumber: number,
): Promise<PublicVideo> {
  const videos = await videosCollection();
  const now = new Date();
  const nextClips = markClipInProgressForEngine(
    project.clips || [],
    clipNumber,
    now.toISOString(),
  );
  await videos.updateOne(
    { _id: project._id },
    { $set: { clips: nextClips, status: "production", updatedAt: now } },
  );
  const updated = (await videos.findOne({ _id: project._id })) ?? {
    ...project,
    clips: nextClips,
    status: "production" as const,
    updatedAt: now,
  };
  try {
    revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
  } catch {
    // Non-request context
  }
  return toPublicVideo(await markUnsentClipVideos(updated));
}

/** Start a Scro Swap job locked to one completed OpenEdit storyboard clip. */
export async function applyClipScroSwap(input: {
  videoId: string;
  clipNumber: number;
  characterId?: string;
  referenceImageUrl?: string;
}): Promise<ApplyClipEngineResult> {
  const user = await requireAppUser();
  const loaded = await loadReadyClip(input.videoId, input.clipNumber, user.clerkUserId);
  if (!loaded.ok) return loaded;

  const started = await startScroSwapJob({
    sourceVideoUrl: loaded.sourceVideoUrl,
    sectionStart: 0,
    sectionLength: loaded.sectionLength,
    characterId: input.characterId,
    referenceImageUrl: input.referenceImageUrl,
    keepSourceAudio: true,
    applyColorFix: true,
    targetVideoId: loaded.project._id.toHexString(),
    targetClipNumber: input.clipNumber,
    previousClipVideoUrl: loaded.sourceVideoUrl,
  });
  if (!started.ok) return started;

  const project = await persistClipInProgress(loaded.project, input.clipNumber);
  return { ok: true, project, jobId: started.job.id };
}

/** Start a Teleport job locked to one completed OpenEdit storyboard clip. */
export async function applyClipTeleport(input: {
  videoId: string;
  clipNumber: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
}): Promise<ApplyClipEngineResult> {
  const user = await requireAppUser();
  const loaded = await loadReadyClip(input.videoId, input.clipNumber, user.clerkUserId);
  if (!loaded.ok) return loaded;

  const started = await startTeleportJob({
    sourceVideoUrl: loaded.sourceVideoUrl,
    aspectRatio: loaded.project.aspectRatio,
    sectionStart: 0,
    sectionLength: loaded.sectionLength,
    sceneImageUrl: input.sceneImageUrl,
    scenePrompt: input.scenePrompt,
    keepSourceAudio: true,
    applyColorFix: true,
    targetVideoId: loaded.project._id.toHexString(),
    targetClipNumber: input.clipNumber,
    previousClipVideoUrl: loaded.sourceVideoUrl,
  });
  if (!started.ok) return started;

  const project = await persistClipInProgress(loaded.project, input.clipNumber);
  return { ok: true, project, jobId: started.job.id };
}
