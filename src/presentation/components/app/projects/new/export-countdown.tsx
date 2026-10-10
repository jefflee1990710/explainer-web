"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { ExportJob } from "@/presentation/components/app/projects/new/browser-video-export";
import {
  formatExportTimeLeft,
  overallExportRatio,
  rawExportSecondsLeft,
  smoothExportSecondsLeft,
} from "@/presentation/components/app/projects/new/export-time-left";

// Remaining time beside the export title. Ticks down once a second between progress samples.
export function ExportTimeLeft({ job }: { job: ExportJob }) {
  const { t } = useI18n();
  const started = useRef<number | null>(null);
  const smoothed = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    started.current ??= now;
    const raw = rawExportSecondsLeft(now - started.current, overallExportRatio(job));
    const next = smoothExportSecondsLeft(smoothed.current, raw);
    smoothed.current = next;
    if (next != null) setLeft(Math.round(next));
  }, [job]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeft((current) => {
        if (current == null || current <= 0) return current;
        const next = current - 1;
        smoothed.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const label =
    left == null
      ? t("video.export.timeEstimating")
      : left <= 0
        ? t("video.export.timeAlmostDone")
        : t("video.export.timeLeft", { time: formatExportTimeLeft(left) });

  return <p className="shrink-0 text-sm font-semibold tabular-nums text-muted">{label}</p>;
}
