// How long a task has been running. Settled tasks stop at updatedAt.
export function taskElapsedMs(createdAt: string, updatedAt: string, settled: boolean, now: number) {
  const start = Date.parse(createdAt);
  const end = settled ? Date.parse(updatedAt) : now;
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const sec = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours} 小時 ${minutes} 分 ${sec} 秒`;
  if (minutes > 0) return `${minutes} 分 ${sec} 秒`;
  return `${seconds} 秒`;
}

// Local clock for the moment the job was created.
export function formatTaskStart(iso: string) {
  return new Date(iso).toLocaleString("zh-Hant", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}
