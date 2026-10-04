"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { EditorStepIcon } from "@/presentation/components/app/projects/[id]/editor-step-icon";
import { currentStepFor } from "@/presentation/components/project/project-stepper";
import { projectStepLabel } from "@/util/project-status-i18n";
import { maxReachableStep, PROJECT_STEPS } from "@/service/project-status";
import type { ProjectStatus } from "@/model/project";

const AVATAR: Record<"production" | "export", string> = {
  production: "bg-[var(--studio-teal)] text-[var(--studio-ink)]",
  export: "bg-[var(--studio-ink)] text-[var(--studio-teal)]",
};

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
}: EditorStepNav) {
  const { t } = useI18n();
  const current = currentStepFor(status, failedAtStep);
  const maxReachable = maxReachableStep(current, clipsReady);

  return (
    <div
      role="tablist"
      aria-label={t("video.editor.stepsAria")}
      className="flex items-center gap-3"
    >
      {PROJECT_STEPS.map((step, index) => {
        if (index === 0 || (step.id !== "production" && step.id !== "export")) return null;
        const label = projectStepLabel(step.id, t);
        const selected = index === viewing;
        const clickable = index <= maxReachable;
        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-label={label}
            title={label}
            aria-selected={selected}
            disabled={!clickable}
            onClick={() => onSelectStep(index)}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 shadow-sm transition duration-200 ${AVATAR[step.id]} ${
              selected
                ? "border-white ring-2 ring-[var(--studio-teal)] ring-offset-2"
                : "border-white/80"
            } ${
              clickable
                ? "cursor-pointer hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm"
                : "cursor-not-allowed opacity-40 shadow-none"
            }`}
          >
            <EditorStepIcon stepId={step.id} />
          </button>
        );
      })}
    </div>
  );
}
