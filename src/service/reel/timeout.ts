import type { ReelStatus } from "@/model/project";

// Local ffmpeg concat. A dead `after()` callback never reaches catch, so a
// busy row older than this is retried or failed by the task poll.
export const REEL_TIMEOUT_MESSAGE = "成片合成逾時";
export const MAX_REEL_ATTEMPTS = 3;
// Let the in-process timeout mark the row before a poller starts a second ffmpeg.
export const REEL_STALE_GRACE_MS = 15_000;

// 90s plus 30s per clip, capped at 10 minutes. Three short clips time out in 3 minutes.
export function reelTimeoutMs(clipCount: number) {
  const clips = Math.max(1, clipCount);
  return Math.min(10 * 60_000, 90_000 + clips * 30_000);
}

export function reelIsStale(
  updatedAt: Date | string | undefined,
  clipCount: number,
  now: number,
) {
  if (!updatedAt) return false;
  const start = new Date(updatedAt).getTime();
  if (Number.isNaN(start)) return false;
  return now - start > reelTimeoutMs(clipCount) + REEL_STALE_GRACE_MS;
}

// null while the attempt may still be running. Missing attempts counts as the first try.
export function reelRecovery(
  input: {
    reelStatus?: ReelStatus;
    updatedAt?: Date | string;
    reelAttempts?: number;
    clipCount: number;
  },
  now: number,
): "retry" | "fail" | null {
  if (input.reelStatus !== "queued" && input.reelStatus !== "in_progress") return null;
  if (!reelIsStale(input.updatedAt, input.clipCount, now)) return null;
  const attempts = input.reelAttempts ?? 1;
  return attempts < MAX_REEL_ATTEMPTS ? "retry" : "fail";
}

// Missing clips or a missing binary will fail the same way every time.
export function isRetryableReelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.startsWith("缺少第")) return false;
  if (message.includes("找不到 ffmpeg")) return false;
  if (message.includes("BLOB_READ_WRITE_TOKEN")) return false;
  return true;
}

export function withTimeout<T>(work: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
