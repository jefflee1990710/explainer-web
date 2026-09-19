import type { FramePosition } from "@/types/project";

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
