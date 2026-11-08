import { after } from "next/server";
import type { ObjectId } from "mongodb";
import {
  enqueueWorkerTask,
  shouldUseWorkerQueueOnly,
} from "@/service/worker/task-queue";

function runInAfterIfLocal(fn: () => void | Promise<unknown>) {
  if (shouldUseWorkerQueueOnly()) return;
  try {
    after(fn);
  } catch {
    void Promise.resolve().then(fn);
  }
}

export function schedulePhaseAWorkerTask(
  projectId: ObjectId,
  revisionNote?: string,
  options?: { clipsOnly?: boolean },
) {
  void enqueueWorkerTask({
    kind: "storyboard_phase_a",
    targetId: projectId,
    lane: "cpu",
    payload: {
      ...(revisionNote ? { revisionNote } : {}),
      ...(options?.clipsOnly ? { clipsOnly: true } : {}),
    },
  }).catch((error) => {
    console.error("[worker-queue] failed to enqueue storyboard_phase_a", {
      projectId: projectId.toHexString(),
      error,
    });
  });

  runInAfterIfLocal(async () => {
    const { runPhaseAJob } = await import("@/service/director/jobs");
    await runPhaseAJob(projectId, revisionNote, options);
  });
}

export function scheduleStillWorkerTask(projectId: ObjectId) {
  void enqueueWorkerTask({
    kind: "storyboard_still",
    targetId: projectId,
    lane: "cpu",
  }).catch((error) => {
    console.error("[worker-queue] failed to enqueue storyboard_still", {
      projectId: projectId.toHexString(),
      error,
    });
  });

  runInAfterIfLocal(async () => {
    const { runStillJob } = await import("@/service/director/jobs");
    await runStillJob(projectId);
  });
}

export function scheduleClipAppendWorkerTask(projectId: ObjectId) {
  void enqueueWorkerTask({
    kind: "clip_generate",
    targetId: projectId,
    lane: "cpu",
  }).catch((error) => {
    console.error("[worker-queue] failed to enqueue clip_generate", {
      projectId: projectId.toHexString(),
      error,
    });
  });

  runInAfterIfLocal(async () => {
    const { runClipAppendQueue } = await import(
      "@/service/clip/clip-timeline-actions"
    );
    await runClipAppendQueue(projectId);
  });
}

export function scheduleLifeShotWorkerTask(input: {
  shotId: ObjectId;
  clerkUserId: string;
  characterHexId: string;
  prompt: string;
  refs: string[];
  spendKey: string;
}) {
  void enqueueWorkerTask({
    kind: "life_shot",
    targetId: input.shotId,
    lane: "cpu",
    payload: {
      clerkUserId: input.clerkUserId,
      characterHexId: input.characterHexId,
      prompt: input.prompt,
      refs: input.refs,
      spendKey: input.spendKey,
    },
  }).catch((error) => {
    console.error("[worker-queue] failed to enqueue life_shot", {
      shotId: input.shotId.toHexString(),
      error,
    });
  });

  runInAfterIfLocal(async () => {
    const { runLifeShotJob } = await import("@/service/character/life");
    await runLifeShotJob(input);
  });
}
