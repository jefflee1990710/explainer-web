import { after } from "next/server";
import type { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { isProjectReady, type ClipStageSource } from "@/service/clip-stage";
import { isProductionLike } from "@/service/project-status";
import {
  clipReelFingerprint,
  isReelBusy,
  isReelCurrent,
  type ReelRecord,
} from "@/service/reel/fingerprint";
import type { Project } from "@/model/project";

// Every clip is done, and no reel for this exact playlist is already running.
export function shouldQueueReel(project: ClipStageSource & ReelRecord) {
  if (!isProductionLike(project.status)) return false;
  if (!isProjectReady(project)) return false;
  if (isReelCurrent(project)) return false;
  const fingerprint = clipReelFingerprint(project);
  if (isReelBusy(project.reelStatus) && project.reelFingerprint === fingerprint) return false;
  return true;
}

// Idempotent write. Returns the fingerprint when this call queued the reel.
export async function markReelQueued(project: Project): Promise<string | null> {
  if (!shouldQueueReel(project)) return null;
  const fingerprint = clipReelFingerprint(project);
  const now = new Date();
  const claimed = await (await videosCollection()).updateOne(
    { _id: project._id, reelStatus: project.reelStatus ?? { $exists: false } },
    {
      $set: { reelStatus: "queued", reelFingerprint: fingerprint, updatedAt: now },
      $unset: { reelError: "" },
    },
  );
  // Another caller queued it between the read and this write.
  if (claimed.modifiedCount !== 1) return null;
  return fingerprint;
}

// Runs after the response. A cron/poller has no `after()`, so fall back to void.
export function scheduleReel(projectId: ObjectId, fingerprint: string) {
  const run = () =>
    import("@/service/director/jobs")
      .then(({ runReelJob }) => runReelJob(projectId, fingerprint))
      .catch((error) => {
        console.error("[reel] compose failed to start", { projectId: projectId.toHexString(), error });
      });
  try {
    after(run);
  } catch {
    void run();
  }
}

// Called when a clip video lands. Queues 成片合成 once the last clip is done.
export async function queueReelIfReady(projectId: ObjectId) {
  const project = await (await videosCollection()).findOne({ _id: projectId });
  if (!project) return;
  const fingerprint = await markReelQueued(project);
  if (fingerprint) scheduleReel(projectId, fingerprint);
}
