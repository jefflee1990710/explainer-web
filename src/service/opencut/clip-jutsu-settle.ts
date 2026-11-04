import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { ProjectClip } from "@/model/project";
import { folderVideoPath } from "@/service/folder-video-path";
import { nextProjectStatus } from "@/service/higgsfield/reconcile";
import { isStandaloneEngineSkillSlug } from "@/service/opencut/standalone-engine-video";
import { queueReelIfReady } from "@/service/reel/enqueue";

/** Pure helper: replace the target clip's video URL when Scro Swap or Teleport completes. */
export function applyCompletedEngineClip(
  clips: ProjectClip[],
  clipNumber: number,
  outputVideoUrl: string,
): ProjectClip[] {
  return clips.map((clip) =>
    clip.clipNumber === clipNumber
      ? {
          ...clip,
          status: "completed" as const,
          blobUrl: outputVideoUrl,
          outputUrl: outputVideoUrl,
          error: undefined,
          unsent: false,
        }
      : clip,
  );
}

/** Pure helper: restore the previous video URL on failure when available so the clip stays playable. */
export function applyFailedEngineClip(
  clips: ProjectClip[],
  clipNumber: number,
  error: string,
  previousClipVideoUrl?: string,
): ProjectClip[] {
  const prev = previousClipVideoUrl?.trim();
  return clips.map((clip) => {
    if (clip.clipNumber !== clipNumber) return clip;
    if (prev) {
      return {
        ...clip,
        status: "completed" as const,
        blobUrl: prev,
        outputUrl: prev,
        error,
        unsent: false,
      };
    }
    return {
      ...clip,
      status: "failed" as const,
      error,
      unsent: false,
    };
  });
}

/** Write completed or failed Scro Swap / Teleport output back to the originating storyboard clip. */
export async function settleTargetClipFromEngineJob(input: {
  targetVideoId?: ObjectId;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
  status: "completed" | "failed";
  outputVideoUrl?: string;
  error?: string;
}): Promise<boolean> {
  if (!input.targetVideoId || !input.targetClipNumber) return false;
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: input.targetVideoId });
  if (!project) return false;

  const clips =
    input.status === "completed" && input.outputVideoUrl
      ? applyCompletedEngineClip(project.clips || [], input.targetClipNumber, input.outputVideoUrl)
      : applyFailedEngineClip(
          project.clips || [],
          input.targetClipNumber,
          input.error || "影片處理失敗",
          input.previousClipVideoUrl,
        );

  const next = { ...project, clips };
  const nextStatus = nextProjectStatus(next);
  const now = new Date();
  const isStandalone = isStandaloneEngineSkillSlug(project.skillSlug);
  await videos.updateOne(
    { _id: project._id },
    {
      $set: {
        clips,
        status: nextStatus,
        ...(isStandalone && input.status === "completed" && input.outputVideoUrl
          ? {
              reelUrl: input.outputVideoUrl,
              reelStatus: "completed" as const,
              error: undefined,
            }
          : {}),
        ...(isStandalone && input.status === "failed"
          ? { error: input.error || "影片處理失敗" }
          : {}),
        updatedAt: now,
      },
    },
  );

  if (input.status === "completed") {
    await queueReelIfReady(project._id).catch((err) => {
      console.error("[clip-jutsu] queueReelIfReady failed", { videoId: project._id.toHexString(), err });
    });
  }

  try {
    revalidatePath("/app");
    revalidatePath("/app/videos");
    revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
  } catch {
    // Non-request background / cron context
  }
  return true;
}
