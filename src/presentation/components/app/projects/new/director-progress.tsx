"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

const DIRECTOR_SUB_STAGES = [
  {
    titleKey: "brief.director.stageReadSource",
    detailKey: "brief.director.stageReadSourceDetail",
  },
  {
    titleKey: "brief.director.stageHook",
    detailKey: "brief.director.stageHookDetail",
  },
  {
    titleKey: "brief.director.stageTimeline",
    detailKey: "brief.director.stageTimelineDetail",
  },
  {
    titleKey: "brief.director.stageVo",
    detailKey: "brief.director.stageVoDetail",
  },
  {
    titleKey: "brief.director.stageLocks",
    detailKey: "brief.director.stageLocksDetail",
  },
] as const;

const PIPELINE_KEYS = [
  "brief.director.pipelineStep1",
  "brief.director.pipelineStep2",
  "brief.director.pipelineStep3",
  "brief.director.pipelineStep4",
  "brief.director.pipelineStep5",
] as const;

// Animated 5-step (1/5 .. 5/5) panel shown while Phase A director planning runs.
export function DirectorProgress() {
  const { t } = useI18n();
  const stages = useMemo(
    () =>
      DIRECTOR_SUB_STAGES.map((stage, idx) => ({
        stepNumber: idx + 1,
        fraction: `${idx + 1}/5`,
        title: t(stage.titleKey),
        detail: t(stage.detailKey),
      })),
    [t],
  );
  const pipelineSteps = useMemo(() => PIPELINE_KEYS.map((key) => t(key)), [t]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % stages.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [stages.length]);

  const currentStage = stages[index] ?? stages[0];

  return (
    <motion.section
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-accent-ink/10 bg-paper p-6 text-foreground shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
    >
      <motion.div
        aria-hidden
        className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime/40 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-accent-ink/10 bg-lime/50 text-accent-ink">
          <Spinner className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-accent-ink px-2.5 py-0.5 text-xs font-bold text-lime tabular-nums">
                1/5
              </span>
              <p className="font-display text-lg font-bold text-accent-ink">
                {t("brief.director.title")}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-accent-ink/15 bg-lime/40 px-2.5 py-0.5 text-xs font-semibold text-accent-ink tabular-nums">
              {t("brief.director.subStepCounter", { step: currentStage.stepNumber })}
            </span>
          </div>

          {/* Active sub-stage title & detailed explanation */}
          <div className="mt-2 min-h-[3.25rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-sm font-semibold text-accent-ink">
                  <span className="mr-1.5 font-mono text-xs font-bold text-accent-ink/70">
                    [{currentStage.fraction}]
                  </span>
                  {currentStage.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {currentStage.detail}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 5 sub-step checklist inside Director Phase A */}
          <ol className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-5">
            {stages.map((stage, idx) => {
              const isCurrent = idx === index;
              const isDone = idx < index;
              return (
                <li
                  key={stage.fraction}
                  onClick={() => setIndex(idx)}
                  className={`cursor-pointer rounded-xl border px-2.5 py-1.5 text-left transition ${
                    isCurrent
                      ? "border-accent-ink bg-lime/40 text-accent-ink shadow-xs"
                      : isDone
                        ? "border-accent-ink/15 bg-accent-ink/5 text-accent-ink/80"
                        : "border-accent-ink/10 bg-paper/60 text-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-bold tabular-nums">
                      {stage.fraction}
                    </span>
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${
                        isCurrent
                          ? "animate-pulse bg-accent-ink"
                          : isDone
                            ? "bg-accent-ink/60"
                            : "bg-accent-ink/20"
                      }`}
                    />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight">
                    {stage.title.replace(/…$/, "")}
                  </p>
                </li>
              );
            })}
          </ol>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-accent-ink/10">
            <motion.div
              className="h-full rounded-full bg-accent-ink"
              initial={{ width: "20%" }}
              animate={{ width: `${((index + 1) / stages.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Overall 5-step production pipeline preview */}
          <div className="mt-4 border-t border-accent-ink/10 pt-3">
            <p className="text-[11px] font-semibold text-accent-ink/80">
              {t("brief.director.pipelineTitle")}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {pipelineSteps.map((label, stepIdx) => (
                <span
                  key={label}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                    stepIdx === 0
                      ? "bg-accent-ink font-semibold text-lime"
                      : "border border-accent-ink/10 bg-accent-ink/5 text-muted"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted">{t("brief.director.eta")}</p>
        </div>
      </div>
    </motion.section>
  );
}
