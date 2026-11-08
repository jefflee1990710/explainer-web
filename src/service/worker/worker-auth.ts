import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { WORKER_TASK_LANES } from "@/model/worker-task";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isWorkerRequestAuthorized(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return false;

  const allowed = [
    env.WORKER_API_KEY?.trim(),
    env.COMFY_API_KEY?.trim(),
    env.CRON_SECRET?.trim(),
  ].filter((v): v is string => Boolean(v && v.length > 0));

  return allowed.some((expected) => safeCompare(token, expected));
}

const claimSchema = z.object({
  lane: z.enum(WORKER_TASK_LANES),
  workerId: z.string().min(1).max(128),
  leaseMs: z.number().int().min(10_000).max(3_600_000).optional(),
});

export function parseWorkerClaimInput(raw: unknown) {
  return claimSchema.parse(raw);
}

const progressSchema = z.object({
  workerId: z.string().min(1).max(128),
  progress: z.number().min(0).max(100).optional(),
  stage: z.string().max(128).optional(),
  leaseMs: z.number().int().min(10_000).max(3_600_000).optional(),
});

export function parseWorkerProgressInput(raw: unknown) {
  return progressSchema.parse(raw);
}

const completeSchema = z.object({
  workerId: z.string().min(1).max(128),
  outcome: z.enum(["completed", "requeue", "failed"]),
  outputUrl: z.string().optional(),
  stage: z.string().max(128).optional(),
  progress: z.number().min(0).max(100).optional(),
  delayMs: z.number().int().min(1_000).max(600_000).optional(),
  lane: z.enum(WORKER_TASK_LANES).optional(),
  error: z.string().max(2000).optional(),
  permanent: z.boolean().optional(),
});

export function parseWorkerCompleteInput(raw: unknown) {
  return completeSchema.parse(raw);
}
