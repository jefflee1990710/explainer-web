"use server";

import { requireClerkUserId } from "@/service/auth";
import { advanceOwnedJobs } from "@/service/generation/task-advance";
import { listTasks, type PublicTask } from "@/service/generation/task-list";

export type TasksResult = { ok: true; tasks: PublicTask[] } | { ok: false; error: string };

// Generation tasks for the signed-in user, optionally one video only.
// Advance first so a finished provider job or a dead send does not sit for hours.
export async function listTasksAction(videoId?: string, advance = true): Promise<TasksResult> {
  try {
    const clerkUserId = await requireClerkUserId();
    // Interval polls advance provider jobs. A click refresh skips that so the
    // new queue row is not stuck behind status checks.
    if (advance) {
      await advanceOwnedJobs(clerkUserId).catch((error) => {
        console.error("[tasks] advance failed", error);
      });
    }
    return { ok: true, tasks: await listTasks(clerkUserId, { videoId }) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "讀取任務失敗" };
  }
}
