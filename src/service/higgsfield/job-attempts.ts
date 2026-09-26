import type { FramePosition } from "@/model/project";

// Pure helpers that answer "did THIS attempt reach the provider?". A job left
// over from an earlier attempt proves nothing: the slot has already been
// re-queued, so an old job would let a lost charge look submitted.

// Only the fields the judgement needs, so the helpers stay testable.
export type JobAttempt = {
  framePosition?: FramePosition;
  createdAt: Date;
};

const POSITIONS: FramePosition[] = ["start", "end"];

// Frame positions with no job from this attempt: nothing will ever move them
// out of `queued`, so the caller must fail and refund exactly these.
export function unsubmittedPositions(
  jobs: JobAttempt[],
  since: Date,
  exclude: FramePosition[] = [],
): FramePosition[] {
  return POSITIONS.filter(
    (position) =>
      !exclude.includes(position) &&
      !jobs.some(
        (job) =>
          job.framePosition === position &&
          job.createdAt.getTime() >= since.getTime(),
      ),
  );
}

// True when this attempt already inserted a job, which then owns the outcome
// (including its own refund on failure).
export function hasJobSince(jobs: Array<{ createdAt: Date }>, since: Date) {
  return jobs.some((job) => job.createdAt.getTime() >= since.getTime());
}

// Positions to mark failed after a partial submit. A deferred end is excluded
// only while its start job exists; if the start never reached the provider,
// the end would stay `queued` with nothing to move it.
export function positionsToFail(
  jobs: JobAttempt[],
  since: Date,
  exclude: FramePosition[] = [],
): FramePosition[] {
  const startMissed = unsubmittedPositions(jobs, since).includes("start");
  const effective = startMissed ? exclude.filter((position) => position !== "end") : exclude;
  return unsubmittedPositions(jobs, since, effective);
}

export type ClaimedFrame = {
  clipNumber: number;
  position: FramePosition;
  status: string;
  submittedAt?: string;
};

export type ClaimedFrameJob = {
  kind?: string;
  clipIndex: number;
  framePosition?: FramePosition;
  createdAt: Date;
};

function claimIsOld(submittedAt: string | undefined, now: number, stuckMs: number) {
  if (!submittedAt) return false;
  const claimedAt = Date.parse(submittedAt);
  if (Number.isNaN(claimedAt)) return false;
  return now - claimedAt > stuckMs;
}

function hasLiveFrameJob(
  jobs: ClaimedFrameJob[],
  clipNumber: number,
  position: FramePosition,
  submittedAt?: string,
) {
  const claimedAt = submittedAt ? Date.parse(submittedAt) : NaN;
  return jobs.some((job) => {
    if (job.kind && job.kind !== "frame") return false;
    if (job.clipIndex !== clipNumber - 1 || job.framePosition !== position) return false;
    if (Number.isNaN(claimedAt)) return true;
    return job.createdAt.getTime() >= claimedAt;
  });
}

// Queued frames whose claim is old and has no job. A deferred end is kept
// while its start is still actually running.
export function orphanQueuedFrames(
  frames: ClaimedFrame[],
  jobs: ClaimedFrameJob[],
  now: number,
  stuckMs: number,
): Array<{ clipNumber: number; position: FramePosition }> {
  const orphanKeys = new Set(
    frames
      .filter(
        (frame) =>
          frame.status === "queued" &&
          claimIsOld(frame.submittedAt, now, stuckMs) &&
          !hasLiveFrameJob(jobs, frame.clipNumber, frame.position, frame.submittedAt),
      )
      .map((frame) => `${frame.clipNumber}:${frame.position}`),
  );

  return frames
    .filter((frame) => {
      if (!orphanKeys.has(`${frame.clipNumber}:${frame.position}`)) return false;
      if (frame.position !== "end") return true;
      const start = frames.find(
        (item) => item.clipNumber === frame.clipNumber && item.position === "start",
      );
      const startStillRunning =
        start?.status === "in_progress" ||
        (start?.status === "queued" && !orphanKeys.has(`${start.clipNumber}:start`));
      return !startStillRunning;
    })
    .map((frame) => ({ clipNumber: frame.clipNumber, position: frame.position }));
}
