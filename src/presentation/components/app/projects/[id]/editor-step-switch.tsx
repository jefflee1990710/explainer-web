"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { EditorStepIcon } from "@/presentation/components/app/projects/[id]/editor-step-icon";
import { projectStepLabel } from "@/util/project-status-i18n";
import { maxReachableStep } from "@/service/project-status";
import type { ProjectStatus } from "@/model/project";

export type EditorStepNav = {
  status: ProjectStatus;
  failedAtStep?: number;
  viewing: number;
  /** Phase A has storyboard clips — unlocks the Video step. */
  phaseAReady: boolean;
  onSelectStep: (step: number) => void;
  // Header 重新開始: reopen the brief form and wipe everything on submit.
  canRestart: boolean;
  onRestart: () => void;
};

const VIDEO_STEP = 1;

// Single editor tab after brief. Production was removed; generation is in Video.
export function EditorStepSwitch({
  viewing,
  phaseAReady,
  onSelectStep,
}: Omit<EditorStepNav, "canRestart" | "onRestart" | "status" | "failedAtStep">) {
  const { t } = useI18n();
  const maxReachable = maxReachableStep(viewing, phaseAReady);
  const clickable = VIDEO_STEP <= maxReachable;
  const selected = viewing === VIDEO_STEP;
  const label = projectStepLabel("video", t);

  return (
    <div
      role="tablist"
      aria-label={t("video.editor.stepsAria")}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--studio-ink)] p-0.5"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        disabled={!clickable}
        onClick={() => onSelectStep(VIDEO_STEP)}
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
        <EditorStepIcon stepId="video" />
        <span>{label}</span>
      </button>
    </div>
  );
}
