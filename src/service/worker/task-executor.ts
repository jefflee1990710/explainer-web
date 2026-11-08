import { ObjectId } from "mongodb";
import {
  extendJobsCollection,
  generationJobsCollection,
  jutsuJobsCollection,
  teleportJobsCollection,
} from "@/dao";
import type { WorkerTask, WorkerTaskLane } from "@/model/worker-task";
import { runLifeShotJob } from "@/service/character/life";
import { runClipAppendQueue } from "@/service/clip/clip-timeline-actions";
import { isComfyPromptStatusUrl } from "@/service/comfy/openjutsu-client";
import { runPhaseAJob, runReelJob, runStillJob } from "@/service/director/jobs";
import {
  advanceExtendJobs,
  runExtendJobInBackground,
} from "@/service/extend/pipeline";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
} from "@/service/higgsfield/generate";
import {
  applyJobStatus,
  refreshProjectJobs,
} from "@/service/higgsfield/pipeline";
import { providerTimedOut } from "@/service/generation/task-policy";
import { failJob, runJobById } from "@/service/generation/task-runner";
import {
  advanceJutsuJobs,
  runScroSwapJobInBackground,
} from "@/service/jutsu/pipeline";
import {
  advanceTeleportJobs,
  runTeleportJobInBackground,
} from "@/service/teleport/pipeline";
import { runFinalJob } from "@/service/video-edit/final-job";
import {
  completeWorkerTask,
  enqueueWorkerTask,
  failOrRetryWorkerTask,
  requeueWorkerTaskForPoll,
  updateWorkerTaskProgress,
} from "@/service/worker/task-queue";

export type WorkerTaskExecutionResult =
  | { outcome: "completed"; outputUrl?: string; stage?: string }
  | {
      outcome: "requeue";
      delayMs: number;
      progress?: number;
      stage?: string;
      lane?: WorkerTaskLane;
    }
  | { outcome: "failed"; error: string; permanent?: boolean };

export async function executeWorkerTask(
  task: WorkerTask,
  options?: {
    onProgress?: (progress: number, stage?: string) => Promise<void>;
  },
): Promise<WorkerTaskExecutionResult> {
  const report = async (progress: number, stage?: string) => {
    if (options?.onProgress) {
      await options.onProgress(progress, stage).catch(() => {});
    }
  };

  switch (task.kind) {
    case "generation_submit": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 GenerationJob ID", permanent: true };
      }
      const jobId = new ObjectId(task.targetId);
      const jobs = await generationJobsCollection();
      const job = await jobs.findOne({ _id: jobId });
      if (!job) {
        return { outcome: "completed", stage: "not_found" };
      }
      if (job.status === "completed") {
        return {
          outcome: "completed",
          outputUrl: job.blobUrl ?? job.outputUrl,
          stage: "completed",
        };
      }
      if (job.status === "failed" || job.status === "nsfw") {
        return {
          outcome: "failed",
          error: job.error ?? "產生失敗",
          permanent: true,
        };
      }
      const now = Date.now();
      if (
        job.status === "pending" &&
        job.nextAttemptAt &&
        job.nextAttemptAt.getTime() > now + 1000
      ) {
        const delayMs = Math.min(15_000, Math.max(2_000, job.nextAttemptAt.getTime() - now));
        return {
          outcome: "requeue",
          delayMs,
          progress: 10,
          stage: job.awaits ? `awaiting_${job.awaits}` : "parked",
        };
      }

      await report(25, "submitting");
      await runJobById(jobId);

      const updated = await jobs.findOne({ _id: jobId });
      if (!updated) {
        return { outcome: "completed", stage: "removed" };
      }
      if (updated.status === "completed") {
        return {
          outcome: "completed",
          outputUrl: updated.blobUrl ?? updated.outputUrl,
          stage: "completed",
        };
      }
      if (updated.status === "failed" || updated.status === "nsfw") {
        return {
          outcome: "failed",
          error: updated.error ?? "產生失敗",
          permanent: true,
        };
      }
      if (updated.status === "pending") {
        const waitMs = updated.nextAttemptAt
          ? Math.max(2_000, updated.nextAttemptAt.getTime() - Date.now())
          : 5_000;
        return {
          outcome: "requeue",
          delayMs: Math.min(30_000, waitMs),
          progress: 15,
          stage: "retry_pending",
        };
      }

      // Async video/image provider is now queued or in_progress: enqueue refresh task.
      const useComfy = Boolean(
        updated.statusUrl && isComfyPromptStatusUrl(updated.statusUrl),
      );
      await enqueueWorkerTask({
        kind: "generation_refresh",
        targetId: jobId,
        lane: useComfy ? "gpu" : "cpu",
        generationKind: updated.kind,
        useComfy,
        nextAttemptAt: new Date(Date.now() + 4_000),
      });
      return { outcome: "completed", stage: "submitted_to_provider" };
    }

    case "generation_refresh": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 GenerationJob ID", permanent: true };
      }
      const jobId = new ObjectId(task.targetId);
      const jobs = await generationJobsCollection();
      const job = await jobs.findOne({ _id: jobId });
      if (!job) {
        return { outcome: "completed", stage: "not_found" };
      }
      if (job.status === "completed") {
        return {
          outcome: "completed",
          outputUrl: job.blobUrl ?? job.outputUrl,
          stage: "completed",
        };
      }
      if (job.status === "failed" || job.status === "nsfw") {
        return {
          outcome: "failed",
          error: job.error ?? "產生失敗",
          permanent: true,
        };
      }

      await report(55, "polling_provider");
      if (job.projectId) {
        await refreshProjectJobs(job.projectId);
      } else if (job.statusUrl && job.requestId) {
        const remote = await fetchHiggsfieldStatus(job.statusUrl);
        await applyJobStatus({
          requestId: job.requestId,
          status: remote.status,
          outputUrl: mediaUrlFromResponse(remote),
        });
      }

      const fresh = await jobs.findOne({ _id: jobId });
      if (!fresh) {
        return { outcome: "completed", stage: "removed" };
      }
      if (fresh.status === "completed") {
        return {
          outcome: "completed",
          outputUrl: fresh.blobUrl ?? fresh.outputUrl,
          stage: "completed",
        };
      }
      if (fresh.status === "failed" || fresh.status === "nsfw") {
        return {
          outcome: "failed",
          error: fresh.error ?? "產生失敗",
          permanent: true,
        };
      }
      if (providerTimedOut(fresh, Date.now())) {
        await failJob(fresh, "產生逾時，credit 已退回");
        return {
          outcome: "failed",
          error: "產生逾時，credit 已退回",
          permanent: true,
        };
      }

      return {
        outcome: "requeue",
        delayMs: 4_500,
        progress: 65,
        stage: fresh.status,
      };
    }

    case "jutsu_swap": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 JutsuJob ID", permanent: true };
      }
      const jobId = new ObjectId(task.targetId);
      const col = await jutsuJobsCollection();
      const job = await col.findOne({ _id: jobId });
      if (!job) return { outcome: "completed", stage: "not_found" };
      if (job.status === "completed") {
        return { outcome: "completed", outputUrl: job.outputVideoUrl, stage: "completed" };
      }
      if (job.status === "failed") {
        return { outcome: "failed", error: job.error ?? "Scro Swap 失敗", permanent: true };
      }

      await report(30, job.openRouterStatusUrl ? "polling_comfy" : "submitting_comfy");
      if (!job.openRouterStatusUrl) {
        await runScroSwapJobInBackground(jobId);
      } else {
        await advanceJutsuJobs(job.clerkUserId);
      }

      const fresh = await col.findOne({ _id: jobId });
      if (!fresh) return { outcome: "completed", stage: "removed" };
      if (fresh.status === "completed") {
        return { outcome: "completed", outputUrl: fresh.outputVideoUrl, stage: "completed" };
      }
      if (fresh.status === "failed") {
        return { outcome: "failed", error: fresh.error ?? "Scro Swap 失敗", permanent: true };
      }
      return {
        outcome: "requeue",
        delayMs: 5_000,
        progress: 65,
        stage: "rendering",
        lane: "gpu",
      };
    }

    case "teleport": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 TeleportJob ID", permanent: true };
      }
      const jobId = new ObjectId(task.targetId);
      const col = await teleportJobsCollection();
      const job = await col.findOne({ _id: jobId });
      if (!job) return { outcome: "completed", stage: "not_found" };
      if (job.status === "completed") {
        return { outcome: "completed", outputUrl: job.outputVideoUrl, stage: "completed" };
      }
      if (job.status === "failed") {
        return { outcome: "failed", error: job.error ?? "Teleport 失敗", permanent: true };
      }

      await report(30, job.openRouterStatusUrl ? "polling_comfy" : "submitting_comfy");
      if (!job.openRouterStatusUrl) {
        await runTeleportJobInBackground(jobId);
      } else {
        await advanceTeleportJobs(job.clerkUserId);
      }

      const fresh = await col.findOne({ _id: jobId });
      if (!fresh) return { outcome: "completed", stage: "removed" };
      if (fresh.status === "completed") {
        return { outcome: "completed", outputUrl: fresh.outputVideoUrl, stage: "completed" };
      }
      if (fresh.status === "failed") {
        return { outcome: "failed", error: fresh.error ?? "Teleport 失敗", permanent: true };
      }
      return {
        outcome: "requeue",
        delayMs: 5_000,
        progress: 65,
        stage: "rendering",
        lane: "gpu",
      };
    }

    case "extend": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 ExtendJob ID", permanent: true };
      }
      const jobId = new ObjectId(task.targetId);
      const col = await extendJobsCollection();
      const job = await col.findOne({ _id: jobId });
      if (!job) return { outcome: "completed", stage: "not_found" };
      if (job.status === "completed") {
        return { outcome: "completed", outputUrl: job.outputVideoUrl, stage: "completed" };
      }
      if (job.status === "failed") {
        return { outcome: "failed", error: job.error ?? "Extend Video 失敗", permanent: true };
      }

      await report(30, job.openRouterStatusUrl ? "polling_comfy" : "submitting_comfy");
      if (!job.openRouterStatusUrl) {
        await runExtendJobInBackground(jobId);
      } else {
        await advanceExtendJobs(job.clerkUserId);
      }

      const fresh = await col.findOne({ _id: jobId });
      if (!fresh) return { outcome: "completed", stage: "removed" };
      if (fresh.status === "completed") {
        return { outcome: "completed", outputUrl: fresh.outputVideoUrl, stage: "completed" };
      }
      if (fresh.status === "failed") {
        return { outcome: "failed", error: fresh.error ?? "Extend Video 失敗", permanent: true };
      }
      return {
        outcome: "requeue",
        delayMs: 5_000,
        progress: 65,
        stage: "rendering",
        lane: "gpu",
      };
    }

    case "storyboard_phase_a":
    case "director_job": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 Project ID", permanent: true };
      }
      await report(25, "generating_storyboard");
      const revisionNote =
        typeof task.payload?.revisionNote === "string"
          ? task.payload.revisionNote
          : undefined;
      const clipsOnly = Boolean(task.payload?.clipsOnly);
      await runPhaseAJob(new ObjectId(task.targetId), revisionNote, { clipsOnly });
      return { outcome: "completed", stage: "phase_a_done" };
    }

    case "storyboard_still": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 Project ID", permanent: true };
      }
      await report(30, "submitting_still");
      await runStillJob(new ObjectId(task.targetId));
      return { outcome: "completed", stage: "still_submitted" };
    }

    case "clip_generate": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 Project ID", permanent: true };
      }
      await report(30, "draining_clip_appends");
      await runClipAppendQueue(new ObjectId(task.targetId));
      return { outcome: "completed", stage: "clip_append_done" };
    }

    case "reel_concat": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 Project ID", permanent: true };
      }
      const fingerprint = String(task.payload?.fingerprint ?? "");
      if (!fingerprint) {
        return { outcome: "failed", error: "缺少 reel fingerprint", permanent: true };
      }
      await report(35, "concatenating_reel");
      await runReelJob(new ObjectId(task.targetId), fingerprint);
      return { outcome: "completed", stage: "reel_done" };
    }

    case "final_render": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 Project ID", permanent: true };
      }
      const fingerprint = String(task.payload?.fingerprint ?? "");
      if (!fingerprint) {
        return { outcome: "failed", error: "缺少 final fingerprint", permanent: true };
      }
      await report(35, "rendering_final_video");
      await runFinalJob(new ObjectId(task.targetId), fingerprint);
      return { outcome: "completed", stage: "final_render_done" };
    }

    case "life_shot": {
      if (!ObjectId.isValid(task.targetId)) {
        return { outcome: "failed", error: "無效的 LifeShot ID", permanent: true };
      }
      const p = task.payload ?? {};
      await report(30, "generating_life_shot");
      await runLifeShotJob({
        shotId: new ObjectId(task.targetId),
        clerkUserId: String(p.clerkUserId ?? ""),
        characterHexId: String(p.characterHexId ?? ""),
        prompt: String(p.prompt ?? ""),
        refs: Array.isArray(p.refs) ? p.refs.map(String) : [],
        spendKey: String(p.spendKey ?? ""),
      });
      return { outcome: "completed", stage: "life_shot_done" };
    }
  }
}

/**
 * High-level runner that claims, executes, and settles one task for the given lane.
 */
export async function processClaimedWorkerTask(
  task: WorkerTask,
  workerId: string,
): Promise<WorkerTaskExecutionResult> {
  try {
    const result = await executeWorkerTask(task, {
      onProgress: async (progress, stage) => {
        await updateWorkerTaskProgress({
          taskId: task._id,
          workerId,
          progress,
          stage,
        });
      },
    });

    if (result.outcome === "completed") {
      await completeWorkerTask({
        taskId: task._id,
        workerId,
        outputUrl: result.outputUrl,
        stage: result.stage,
      });
    } else if (result.outcome === "requeue") {
      await requeueWorkerTaskForPoll({
        taskId: task._id,
        workerId,
        delayMs: result.delayMs,
        progress: result.progress,
        stage: result.stage,
        lane: result.lane,
      });
    } else {
      await failOrRetryWorkerTask({
        taskId: task._id,
        workerId,
        error: result.error,
        permanent: result.permanent,
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker 執行失敗";
    await failOrRetryWorkerTask({
      taskId: task._id,
      workerId,
      error: message,
    });
    return { outcome: "failed", error: message };
  }
}
