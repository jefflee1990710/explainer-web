"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { PlanningRunner } from "@/presentation/components/app/projects/new/planning-runner";

/** Storyboard usually lands within a minute. The bar follows elapsed time and holds here until the job finishes. */
const EXPECTED_MS = 60_000;
const PROGRESS_CAP = 0.9;

// Phase A is one job with no intermediate percent, so the fill is elapsed time, not a rotating stage list.
export function DirectorProgress() {
  const { t } = useI18n();
  const startedAt = useRef(0);
  const [percent, setPercent] = useState(2);

  useEffect(() => {
    startedAt.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      const ratio = Math.min(PROGRESS_CAP, Math.max(0.02, elapsed / EXPECTED_MS));
      setPercent(Math.round(ratio * 100));
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, []);

  const status = t("brief.director.title");

  return (
    <section
      role="status"
      aria-live="polite"
      className="w-full max-w-2xl rounded-[1.5rem] border border-accent-ink/10 bg-paper px-4 py-4 text-foreground shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:px-5"
    >
      <PlanningRunner />
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center rounded-full bg-accent-ink px-2 py-0.5 text-xs font-bold text-lime tabular-nums">
          1/5
        </span>
        <p className="min-w-0 flex-1 font-display text-base font-bold leading-snug text-accent-ink">
          {status}
        </p>
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-accent-ink">
          {percent}%
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-accent-ink/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={status}
      >
        <div
          className="h-full rounded-full bg-accent-ink transition-[width] duration-200 ease-linear motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
