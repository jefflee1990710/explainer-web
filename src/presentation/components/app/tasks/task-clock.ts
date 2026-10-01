// How long a task has been running. Settled tasks stop at updatedAt.
import type { TranslateFn } from "@/util/i18n/translate";

export function taskElapsedMs(createdAt: string, updatedAt: string, settled: boolean, now: number) {
  const start = Date.parse(createdAt);
  const end = settled ? Date.parse(updatedAt) : now;
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

export function formatElapsed(ms: number, t: TranslateFn) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const sec = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return t("tasksPage.clock.elapsedHms", { h: hours, m: minutes, s: sec });
  }
  if (minutes > 0) {
    return t("tasksPage.clock.elapsedMs", { m: minutes, s: sec });
  }
  return t("tasksPage.clock.elapsedS", { s: seconds });
}

// Local clock for the moment the job was created.
export function formatTaskStart(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}
