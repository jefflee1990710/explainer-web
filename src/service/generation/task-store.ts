import { after } from "next/server";
import type { Filter, ObjectId } from "mongodb";
import { generationJobsCollection } from "@/dao";
import {
  MAX_SUBMIT_ATTEMPTS,
  SUBMIT_LOCK_MS,
  retryDelayMs,
  submittedJobStatus,
} from "@/service/generation/task-policy";
import type { GenerationJob } from "@/model/generation-job";

export type NewJob = Omit<
  GenerationJob,
  "_id" | "status" | "createdAt" | "updatedAt" | "model"
> & { model?: string };

// Queue a job; the provider is not called here.
export async function insertPendingJob(job: NewJob): Promise<ObjectId> {
  const jobs = await generationJobsCollection();
  const now = new Date();
  const { insertedId } = await jobs.insertOne({
    ...job,
    model: job.model ?? "",
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  } as GenerationJob);
  return insertedId;
}

// Due pending jobs, or submitting jobs whose runner died mid-send.
function claimableFilter(now: Date) {
  return {
    attempts: { $lt: MAX_SUBMIT_ATTEMPTS },
    $or: [
      { status: "pending" as const, nextAttemptAt: { $lte: now } },
      { status: "submitting" as const, lockedUntil: { $lt: now } },
    ],
  };
}

function claimUpdate(now: Date) {
  return {
    $set: {
      status: "submitting" as const,
      lockedUntil: new Date(now.getTime() + SUBMIT_LOCK_MS),
      updatedAt: now,
    },
    $inc: { attempts: 1 },
  };
}

// Atomic claim so `after()` and the cron never send the same job twice.
export async function claimJobById(id: ObjectId) {
  const jobs = await generationJobsCollection();
  const now = new Date();
  return jobs.findOneAndUpdate({ _id: id, ...claimableFilter(now) }, claimUpdate(now), {
    returnDocument: "after",
  });
}

// Oldest claimable job first.
export async function claimNextJob() {
  const jobs = await generationJobsCollection();
  const now = new Date();
  return jobs.findOneAndUpdate(claimableFilter(now), claimUpdate(now), {
    sort: { createdAt: 1 },
    returnDocument: "after",
  });
}

// Only the runner holding this claim may write; a newer claim bumped `attempts`.
function claimFence(job: Pick<GenerationJob, "_id" | "attempts">) {
  return { _id: job._id, status: "submitting" as const, attempts: job.attempts };
}

// Provider accepted the request. False when the claim was lost to another runner.
export async function markSubmitted(
  job: Pick<GenerationJob, "_id" | "attempts">,
  sent: { requestId: string; statusUrl?: string; status?: string; model: string },
) {
  const jobs = await generationJobsCollection();
  const now = new Date();
  const result = await jobs.updateOne(claimFence(job), {
    $set: {
      requestId: sent.requestId,
      statusUrl: sent.statusUrl,
      model: sent.model,
      status: submittedJobStatus(sent.status),
      submittedAt: now,
      updatedAt: now,
    },
    $unset: { lockedUntil: "", nextAttemptAt: "", error: "" },
  });
  return result.matchedCount === 1;
}

// Transient send failure: back to pending with a backoff. False when the claim was lost.
export async function markRetry(job: GenerationJob, message: string) {
  const jobs = await generationJobsCollection();
  const now = new Date();
  const result = await jobs.updateOne(
    claimFence(job),
    {
      $set: {
        status: "pending",
        error: message,
        nextAttemptAt: new Date(now.getTime() + retryDelayMs(job.attempts ?? 1)),
        updatedAt: now,
      },
      $unset: { lockedUntil: "" },
    },
  );
  return result.matchedCount === 1;
}

// Flip to failed only if nobody else did; the winner refunds. `onlyIf` narrows
// the claim (e.g. the runner's own claim fence) so a newer attempt is untouched.
export async function claimFailure(
  id: ObjectId,
  message: string,
  status: "failed" | "nsfw" = "failed",
  onlyIf: Filter<GenerationJob> = {},
) {
  const jobs = await generationJobsCollection();
  return jobs.findOneAndUpdate(
    { _id: id, status: { $nin: ["failed", "nsfw", "completed"] }, ...onlyIf },
    {
      $set: { status, error: message, updatedAt: new Date() },
      $unset: { lockedUntil: "", nextAttemptAt: "" },
    },
    { returnDocument: "after" },
  );
}

// Try to send right after the response. Outside a request scope (scripts)
// `after` throws; the submit cron picks the job up within a minute instead.
export function kickJob(id: ObjectId) {
  try {
    after(async () => {
      const { runJobById } = await import("@/service/generation/task-runner");
      await runJobById(id);
    });
  } catch {
    // No request scope: leave it pending for the cron.
  }
}
