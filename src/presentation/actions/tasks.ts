"use server";

import { requireClerkUserId } from "@/service/auth";
import { listTasks, type PublicTask } from "@/service/generation/task-list";

export type TasksResult = { ok: true; tasks: PublicTask[] } | { ok: false; error: string };

// Generation tasks for the signed-in user, optionally one video only.
export async function listTasksAction(videoId?: string): Promise<TasksResult> {
  try {
    const clerkUserId = await requireClerkUserId();
    return { ok: true, tasks: await listTasks(clerkUserId, { videoId }) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "讀取任務失敗" };
  }
}
