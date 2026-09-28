// Clip numbers a "產生全部影片" run is done with: started, or dropped for good.
// Only these are pulled from the stored list, so a concurrent run's edits to
// the list are never overwritten by this run's stale copy.
export function settledAutoVideoClips(pending: number[], remaining: number[]): number[] {
  const keep = new Set(remaining);
  return [...new Set(pending.filter((clipNumber) => !keep.has(clipNumber)))].sort(
    (a, b) => a - b,
  );
}
