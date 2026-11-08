import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export const WORKER_TASK_LANES = ["gpu", "cpu"] as const;
export type WorkerTaskLane = (typeof WORKER_TASK_LANES)[number];

export const WORKER_TASK_KINDS = [
  "generation_submit",
  "generation_refresh",
  "jutsu_swap",
  "teleport",
  "extend",
  "storyboard_phase_a",
  "storyboard_still",
  "clip_generate",
  "reel_concat",
  "final_render",
  "life_shot",
  "director_job",
] as const;
export type WorkerTaskKind = (typeof WORKER_TASK_KINDS)[number];

export const WORKER_TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "failed",
] as const;
export type WorkerTaskStatus = (typeof WORKER_TASK_STATUSES)[number];

export type WorkerTask = {
  _id: ObjectId;
  kind: WorkerTaskKind;
  lane: WorkerTaskLane;
  status: WorkerTaskStatus;
  targetId: string;
  dedupeKey?: string;
  payload?: Record<string, unknown>;
  progress?: number;
  stage?: string;
  workerId?: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lockedUntil?: Date;
  heartbeatAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  outputUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const workerTaskSchema: z.ZodType<WorkerTask> = z.object({
  _id: objectIdSchema,
  kind: z.enum(WORKER_TASK_KINDS),
  lane: z.enum(WORKER_TASK_LANES),
  status: z.enum(WORKER_TASK_STATUSES),
  targetId: z.string().min(1),
  dedupeKey: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  progress: z.number().min(0).max(100).optional(),
  stage: z.string().optional(),
  workerId: z.string().optional(),
  attempts: z.number().int().min(0),
  maxAttempts: z.number().int().min(1),
  nextAttemptAt: z.date(),
  lockedUntil: z.date().optional(),
  heartbeatAt: z.date().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  outputUrl: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PublicWorkerTask = {
  id: string;
  kind: WorkerTaskKind;
  lane: WorkerTaskLane;
  status: WorkerTaskStatus;
  targetId: string;
  payload?: Record<string, unknown>;
  progress?: number;
  stage?: string;
  workerId?: string;
  attempts: number;
  maxAttempts: number;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export function toPublicWorkerTask(task: WorkerTask): PublicWorkerTask {
  return {
    id: task._id.toHexString(),
    kind: task.kind,
    lane: task.lane,
    status: task.status,
    targetId: task.targetId,
    payload: task.payload,
    progress: task.progress,
    stage: task.stage,
    workerId: task.workerId,
    attempts: task.attempts,
    maxAttempts: task.maxAttempts,
    outputUrl: task.outputUrl,
    error: task.error,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
