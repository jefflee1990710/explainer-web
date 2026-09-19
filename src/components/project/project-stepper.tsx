"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/components/i18n-provider";
import { projectStepLabel } from "@/lib/project-status-i18n";
import { PROJECT_STEPS, STATUS_META } from "@/lib/project-status";
import type { ProjectStatus } from "@/types/project";

// Which step is "current" for a status; failed projects keep the step they
// fell over on (inferred by the caller via `failedAtStep`).
export function currentStepFor(status: ProjectStatus, failedAtStep?: number) {
  if (status === "failed") return failedAtStep ?? 1;
  return STATUS_META[status].step;
}

// Horizontal stepper: 題材 → 分鏡 → 製作.
export function ProjectStepper({
  status,
  failedAtStep,
  compact = false,
  busy,
  detail,
}: {
  status: ProjectStatus;
  failedAtStep?: number;
  compact?: boolean;
  // Overrides STATUS_META.busy when the caller knows (isProjectBusy).
  busy?: boolean;
  // Small text under the current step, e.g. "影片 2/6".
  detail?: string;
}) {
  const { t } = useI18n();
  const current = currentStepFor(status, failedAtStep);
  const done = status === "ready";
  const failed = status === "failed";
  const isBusy = busy ?? STATUS_META[status].busy;

  if (compact) {
    return (
      <ol className="flex items-center gap-1" aria-label="Progress">
        {PROJECT_STEPS.map((step, index) => {
          const state =
            done || index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li
              key={step.id}
              title={projectStepLabel(step.id, t)}
              className={`h-1.5 rounded-full transition-all ${
                state === "done"
                  ? "w-5 bg-teal"
                  : state === "current"
                    ? failed
                      ? "w-5 bg-accent"
                      : "w-5 bg-accent-ink"
                    : "w-2.5 bg-accent-ink/15"
              }`}
            />
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Project steps">
      {PROJECT_STEPS.map((step, index) => {
        const state =
          done || index < current ? "done" : index === current ? "current" : "todo";
        const isLast = index === PROJECT_STEPS.length - 1;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full border font-display text-xs font-bold transition-colors ${
                  state === "done"
                    ? "border-teal bg-teal text-white"
                    : state === "current"
                      ? failed
                        ? "border-accent bg-accent text-white"
                        : "border-accent-ink bg-accent-ink text-lime"
                      : "border-accent-ink/15 bg-paper text-muted"
                }`}
              >
                {state === "done" ? (
                  <CheckIcon />
                ) : state === "current" && failed ? (
                  <ExclamationIcon />
                ) : (
                  index + 1
                )}
                {state === "current" && isBusy ? (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full border-2 border-accent-ink/40"
                    animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  />
                ) : null}
              </span>
              <span className="hidden flex-col leading-tight sm:flex">
                <span
                  className={`text-sm font-semibold ${
                    state === "todo" ? "text-muted" : "text-foreground"
                  }`}
                >
                  {projectStepLabel(step.id, t)}
                </span>
                <span className="font-display text-[10px] uppercase tracking-wider text-muted">
                  {state === "current" && detail ? detail : step.id}
                </span>
              </span>
            </div>
            {!isLast ? (
              <span
                aria-hidden
                className={`h-px flex-1 ${
                  state === "done" ? "bg-teal" : "bg-accent-ink/15"
                }`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 7v6m0 4h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
