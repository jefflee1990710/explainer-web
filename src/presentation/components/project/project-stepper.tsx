"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { projectStepLabel } from "@/util/project-status-i18n";
import {
  maxReachableStep,
  PROJECT_STEPS,
  STATUS_META,
  stepVisualState,
} from "@/service/project-status";
import type { ProjectStatus } from "@/model/project";

// Which step is "current" for a status; failed projects keep the step they
// fell over on (inferred by the caller via `failedAtStep`).
export function currentStepFor(status: ProjectStatus, failedAtStep?: number) {
  if (status === "failed") return failedAtStep ?? 1;
  return STATUS_META[status].step;
}

// Horizontal stepper: 題材 → 製作 → 成片. Reached steps are buttons
// so the user can jump back and edit; later steps stay inert until unlocked.
export function ProjectStepper({
  status,
  failedAtStep,
  compact = false,
  busy,
  detail,
  viewingStep,
  onSelectStep,
  clipsReady = false,
  reelReady = false,
}: {
  status: ProjectStatus;
  failedAtStep?: number;
  compact?: boolean;
  // Overrides STATUS_META.busy when the caller knows (isProjectBusy).
  busy?: boolean;
  // Small text under the current step, e.g. "影片 2/6".
  detail?: string;
  // Which step the workspace is showing; defaults to the live status step.
  viewingStep?: number;
  onSelectStep?: (step: number) => void;
  // All clips video_ready — unlocks step 4 without auto-advancing.
  clipsReady?: boolean;
  reelReady?: boolean;
}) {
  const { t } = useI18n();
  const current = currentStepFor(status, failedAtStep);
  const viewed = viewingStep ?? current;
  const failed = status === "failed";
  const isBusy = busy ?? STATUS_META[status].busy;
  const maxReachable = maxReachableStep(current, clipsReady);

  if (compact) {
    return (
      <ol className="flex items-center gap-1" aria-label="Progress">
        {PROJECT_STEPS.map((step, index) => {
          const state = stepVisualState(index, current, clipsReady, reelReady);
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
        const state = stepVisualState(index, current, clipsReady, reelReady);
        const isLast = index === PROJECT_STEPS.length - 1;
        const isViewing = index === viewed;
        const clickable = Boolean(onSelectStep) && index <= maxReachable;
        const label = projectStepLabel(step.id, t);
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            {clickable ? (
              <button
                type="button"
                onClick={() => onSelectStep?.(index)}
                aria-current={isViewing ? "step" : undefined}
                aria-label={`前往${label}`}
                className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-1 text-left transition hover:-translate-y-0.5 ${
                  isViewing ? "outline outline-2 outline-offset-2 outline-accent-ink" : ""
                }`}
              >
                <StepGlyph
                  index={index}
                  state={state}
                  failed={failed}
                  busy={state === "current" && isBusy}
                />
                <StepCopy
                  label={label}
                  sublabel={state === "current" && detail ? detail : step.id}
                  muted={state === "todo"}
                />
              </button>
            ) : (
              <div className="flex min-h-[44px] items-center gap-2 px-1">
                <StepGlyph
                  index={index}
                  state={state}
                  failed={failed}
                  busy={state === "current" && isBusy}
                />
                <StepCopy
                  label={label}
                  sublabel={step.id}
                  muted
                />
              </div>
            )}
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

function StepGlyph({
  index,
  state,
  failed,
  busy,
}: {
  index: number;
  state: "done" | "current" | "todo";
  failed: boolean;
  busy: boolean;
}) {
  return (
    <span
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
      {busy ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-accent-ink/40"
          animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
    </span>
  );
}

function StepCopy({
  label,
  sublabel,
  muted,
}: {
  label: string;
  sublabel: string;
  muted?: boolean;
}) {
  return (
    <span className="hidden flex-col leading-tight sm:flex">
      <span className={`text-sm font-semibold ${muted ? "text-muted" : "text-foreground"}`}>
        {label}
      </span>
      <span className="font-display text-[10px] uppercase tracking-wider text-muted">
        {sublabel}
      </span>
    </span>
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
