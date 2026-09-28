import type { GenerationJob, GenerationStatus } from "@/model/generation-job";

// Pure queue rules shared by the runner, crons, and reconcile.

export const MAX_SUBMIT_ATTEMPTS = 3;
export const SUBMIT_LOCK_MS = 5 * 60_000;
export const PROVIDER_TIMEOUT_MS = 30 * 60_000;
// Jobs sent per cron run; keeps one invocation well under the function timeout.
export const SUBMIT_BATCH = 6;

const RETRY_DELAYS_MS = [60_000, 3 * 60_000, 10 * 60_000];

// Thrown by senders when retrying cannot help (missing style, frames gone...).
export class PermanentJobError extends Error {}

export function isJobInFlight(status: GenerationStatus) {
  return (
    status === "pending" ||
    status === "submitting" ||
    status === "queued" ||
    status === "in_progress"
  );
}

export function isJobTerminal(status: GenerationStatus) {
  return status === "completed" || status === "failed" || status === "nsfw";
}

// Delay before the next attempt, given how many attempts already ran.
export function retryDelayMs(attempts: number) {
  const index = Math.min(Math.max(attempts, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[index];
}

export function shouldRetrySubmit(error: unknown, attempts: number) {
  if (error instanceof PermanentJobError) return false;
  return attempts < MAX_SUBMIT_ATTEMPTS;
}

// Sent to the provider but no result for too long: fail and refund.
export function providerTimedOut(
  job: Pick<GenerationJob, "status" | "submittedAt" | "createdAt">,
  now: number,
) {
  if (job.status !== "queued" && job.status !== "in_progress") return false;
  const since = (job.submittedAt ?? job.createdAt).getTime();
  return now - since > PROVIDER_TIMEOUT_MS;
}
