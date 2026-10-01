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
import { REEL_TIMEOUT_MESSAGE, reelRecovery } from "@/service/reel/timeout";
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
      $set: {
        reelStatus: "queued",
        reelFingerprint: fingerprint,
        reelAttempts: 1,
        updatedAt: now,
      },
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

type StaleReel = Pick<
  Project,
  | "_id"
  | "status"
  | "phaseA"
  | "clips"
  | "frames"
  | "reelStatus"
  | "reelFingerprint"
  | "reelAttempts"
  | "updatedAt"
>;

// A busy reel whose worker died (dev reload, dropped after()) is queued again.
// Returns true when this call changed the row.
export async function recoverStaleReel(project: StaleReel, now = Date.now()) {
  const clipCount = project.phaseA?.clips.length ?? project.clips.length;
  const decision = reelRecovery(
    {
      reelStatus: project.reelStatus,
      updatedAt: project.updatedAt,
      reelAttempts: project.reelAttempts,
      clipCount,
    },
    now,
  );
  if (!decision) return false;

  const projects = await videosCollection();
  const stamp = project.updatedAt;
  // Only the caller that still sees this exact busy row may change it.
  const match = { _id: project._id, reelStatus: project.reelStatus, updatedAt: stamp };
  if (decision === "fail" || !isProductionLike(project.status) || !isProjectReady(project)) {
    const failed = await projects.updateOne(match, {
      $set: { reelStatus: "failed", reelError: REEL_TIMEOUT_MESSAGE, updatedAt: new Date(now) },
    });
    return failed.modifiedCount === 1;
  }

  const fingerprint = clipReelFingerprint(project);
  const attempts = project.reelAttempts ?? 1;
  const nextAttempts = project.reelFingerprint === fingerprint ? attempts + 1 : 1;
  const claimed = await projects.updateOne(match, {
    $set: {
      reelStatus: "queued",
      reelFingerprint: fingerprint,
      reelAttempts: nextAttempts,
      updatedAt: new Date(now),
    },
    $unset: { reelError: "" },
  });
  if (claimed.modifiedCount !== 1) return false;
  scheduleReel(project._id, fingerprint);
  return true;
}

// Called when a clip video lands. Queues 成片合成 once the last clip is done.
export async function queueReelIfReady(projectId: ObjectId) {
  const project = await (await videosCollection()).findOne({ _id: projectId });
  if (!project) return;
  const fingerprint = await markReelQueued(project);
  if (fingerprint) scheduleReel(projectId, fingerprint);
}
