"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { currentStepFor } from "@/presentation/components/project/project-stepper";
import { projectStepLabel } from "@/util/project-status-i18n";
import { maxReachableStep, PROJECT_STEPS } from "@/service/project-status";
import type { ProjectStatus } from "@/model/project";

export type EditorStepNav = {
  status: ProjectStatus;
  failedAtStep?: number;
  viewing: number;
  clipsReady: boolean;
  onSelectStep: (step: number) => void;
};

// Production / Reel only. Input lives on the create dialog, not this editor.
export function EditorStepSwitch({
  status,
  failedAtStep,
  viewing,
  clipsReady,
  onSelectStep,
}: EditorStepNav) {
  const { t } = useI18n();
  const current = currentStepFor(status, failedAtStep);
  const maxReachable = maxReachableStep(current, clipsReady);

  return (
    <div
      role="tablist"
      aria-label="編輯步驟"
      className="flex flex-wrap gap-0.5 rounded-lg bg-[var(--studio-fill)] p-0.5"
    >
      {PROJECT_STEPS.map((step, index) => {
        if (index === 0) return null;
        const label = projectStepLabel(step.id, t);
        const selected = index === viewing;
        const clickable = index <= maxReachable;
        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={!clickable}
            onClick={() => onSelectStep(index)}
            className={`inline-flex min-h-8 items-center rounded-md px-3 text-sm font-medium transition ${
              selected
                ? "border border-[var(--studio-line)] bg-white text-[var(--studio-ink)]"
                : clickable
                  ? "cursor-pointer text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                  : "cursor-not-allowed text-[var(--studio-muted)]/50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
