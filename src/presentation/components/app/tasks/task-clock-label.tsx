"use client";

import { useEffect, useState } from "react";
import { formatElapsed, formatTaskStart, taskElapsedMs } from "@/presentation/components/app/tasks/task-clock";

// Start clock plus a live elapsed timer. Finished tasks freeze at their duration.
export function TaskClockLabel({
  createdAt,
  updatedAt,
  settled,
}: {
  createdAt: string;
  updatedAt: string;
  settled: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (settled) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [settled]);

  const elapsed = formatElapsed(taskElapsedMs(createdAt, updatedAt, settled, now));
  return (
    <span>
      開始{" "}
      <time dateTime={createdAt} suppressHydrationWarning>
        {formatTaskStart(createdAt)}
      </time>
      {" · "}
      {settled ? "耗時" : "已過"} {elapsed}
    </span>
  );
}
