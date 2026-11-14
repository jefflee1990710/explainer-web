// Phase A can take longer than a minute. A second run must not overwrite the
// storyboard while the first run's frames are already being drawn.

export const PHASE_A_LOCK_STALE_MS = 8 * 60 * 1000;

export type PhaseALock = {
  token: string;
  at: Date;
};

export function phaseALockIsStale(
  lock: { at?: Date | string } | null | undefined,
  now = new Date(),
) {
  if (!lock?.at) return true;
  const at = lock.at instanceof Date ? lock.at.getTime() : new Date(lock.at).getTime();
  return Number.isNaN(at) || now.getTime() - at >= PHASE_A_LOCK_STALE_MS;
}

export function phaseAFramesAlreadyDrawing(
  frames:
    | Array<{
        status?: string;
        submittedAt?: Date | string;
        blobUrl?: string;
        outputUrl?: string;
      }>
    | null
    | undefined,
) {
  return (frames || []).some(
    (frame) =>
      frame.status === "queued" ||
      frame.status === "in_progress" ||
      frame.status === "completed" ||
      Boolean(frame.submittedAt) ||
      Boolean(frame.blobUrl) ||
      Boolean(frame.outputUrl),
  );
}

// Cron recovery keeps the storyboard that already started drawing frames.
// An explicit revise still replaces it.
export function phaseAReclaimShouldKeepStoryboard(input: {
  revisionNote?: string;
  clipsOnly?: boolean;
  hadLock?: boolean;
  lockStale: boolean;
  hasPhaseA: boolean;
  framesDrawing: boolean;
}) {
  return (
    !input.revisionNote &&
    !input.clipsOnly &&
    Boolean(input.hadLock) &&
    input.lockStale &&
    input.hasPhaseA &&
    input.framesDrawing
  );
}
