export const VOICE_FILL_LIMIT = 5;
export const VOICE_FILL_WINDOW_MS = 5 * 60 * 1000;

// Fills still inside the window. Older stamps do not count.
export function recentVoiceFills(stamps: Array<Date | string> | undefined, now: Date): Date[] {
  const since = now.getTime() - VOICE_FILL_WINDOW_MS;
  return (stamps ?? [])
    .map((stamp) => new Date(stamp))
    .filter((stamp) => stamp.getTime() > since);
}

export function voiceFillRateLimited(stamps: Array<Date | string> | undefined, now: Date): boolean {
  return recentVoiceFills(stamps, now).length >= VOICE_FILL_LIMIT;
}
