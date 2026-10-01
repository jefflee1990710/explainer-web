"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
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
  const { t, locale } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (settled) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [settled]);

  const elapsed = formatElapsed(taskElapsedMs(createdAt, updatedAt, settled, now), t);
  return (
    <span>
      {t("tasksPage.clock.started")}{" "}
      <time dateTime={createdAt} suppressHydrationWarning>
        {formatTaskStart(createdAt, locale)}
      </time>
      {" · "}
      {settled ? t("tasksPage.clock.took") : t("tasksPage.clock.elapsed")} {elapsed}
    </span>
  );
}
