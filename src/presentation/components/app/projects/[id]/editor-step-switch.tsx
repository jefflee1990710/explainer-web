"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { EditorStepIcon } from "@/presentation/components/app/projects/[id]/editor-step-icon";
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
  // Header 重新開始: reopen the brief form and wipe everything on submit.
  canRestart: boolean;
  onRestart: () => void;
};

// Production / Reel only. Input lives on the create dialog, not this editor.
export function EditorStepSwitch({
  status,
  failedAtStep,
  viewing,
  clipsReady,
  onSelectStep,
}: Omit<EditorStepNav, "canRestart" | "onRestart">) {
  const { t } = useI18n();
  const current = currentStepFor(status, failedAtStep);
  const maxReachable = maxReachableStep(current, clipsReady);
  const steps: { id: "production" | "export"; index: number }[] = [];
  PROJECT_STEPS.forEach((step, index) => {
    if (step.id === "production" || step.id === "export") steps.push({ id: step.id, index });
  });

  return (
    <div
      role="tablist"
      aria-label={t("video.editor.stepsAria")}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--studio-ink)] p-0.5"
    >
      {steps.map(({ id, index }) => {
        const label = projectStepLabel(id, t);
        const selected = index === viewing;
        const clickable = index <= maxReachable;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={!clickable}
            onClick={() => onSelectStep(index)}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] [&_svg]:h-3.5 [&_svg]:w-3.5 ${
              selected
                ? "bg-white font-semibold text-[var(--studio-ink)]"
                : "font-medium text-white/70"
            } ${
              clickable
                ? selected
                  ? "cursor-pointer"
                  : "cursor-pointer hover:text-white"
                : "cursor-not-allowed opacity-40"
            }`}
          >
            <EditorStepIcon stepId={id} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
