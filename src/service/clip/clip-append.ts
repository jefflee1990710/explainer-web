import type { ClipAppend } from "@/model/project";

// One director call. A dead worker can be claimed again after this.
export const CLIP_APPEND_LEASE_MS = 10 * 60 * 1000;

type ClipAppendJob = Pick<ClipAppend, "id" | "insertAt" | "status">;

// Resume an interrupted write before starting the next queued one.
// A mid-board insert waits while frames or the reel are busy; an end append can pass it.
export function nextClipAppend<T extends ClipAppendJob>(
  jobs: T[],
  options?: { clipCount: number; mediaBusy: boolean; reelBusy: boolean },
): T | undefined {
  const writing = jobs.find((job) => job.status === "writing");
  if (writing) return writing;
  const queued = jobs.filter((job) => job.status === "queued");
  if (!options) return queued[0];
  return queued.find((job) => {
    const shifts = job.insertAt <= options.clipCount;
    return !(shifts && (options.mediaBusy || options.reelBusy));
  });
}

// Later queued slots move forward with the clips this insert pushed aside.
export function shiftPendingInserts<T extends ClipAppendJob>(
  jobs: T[],
  doneId: string,
  insertAt: number,
  added: number,
): T[] {
  return jobs
    .filter((job) => job.id !== doneId)
    .map((job) =>
      job.status !== "failed" && job.insertAt >= insertAt
        ? { ...job, insertAt: job.insertAt + added }
        : job,
    );
}

// Keep the newest failures so a stuck error does not grow the document forever.
export function trimFailedClipAppends<T extends { status: string }>(jobs: T[], keep = 5): T[] {
  let failed = 0;
  const newestFirst = [...jobs].reverse().filter((job) => {
    if (job.status !== "failed") return true;
    failed += 1;
    return failed <= keep;
  });
  return newestFirst.reverse();
}

// True when a queued write has no live lease, so a poll should start the worker.
export function clipAppendNeedsKick(
  project: {
    clipAppends?: Array<{ status: string }>;
    clipAppendLockUntil?: Date | string | null;
  },
  now = Date.now(),
) {
  const active = (project.clipAppends ?? []).some(
    (job) => job.status === "queued" || job.status === "writing",
  );
  if (!active) return false;
  if (!project.clipAppendLockUntil) return true;
  return new Date(project.clipAppendLockUntil).getTime() <= now;
}
