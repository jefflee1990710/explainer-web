"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { TaskStage } from "@/service/generation/task-list";

const TONE: Record<TaskStage, string> = {
  queued: "text-[var(--studio-muted)] border-[var(--studio-line)]",
  sending: "text-[var(--studio-teal)] border-[var(--studio-teal)]/40",
  generating: "text-[var(--studio-teal)] border-[var(--studio-teal)]/40",
  done: "text-[var(--studio-ink)] border-[var(--studio-line)]",
  failed: "text-accent border-accent/40",
};

const STAGE_KEY: Record<TaskStage, string> = {
  queued: "tasksPage.stage.queued",
  sending: "tasksPage.stage.sending",
  generating: "tasksPage.stage.generating",
  done: "tasksPage.stage.done",
  failed: "tasksPage.stage.failed",
};

// Small pill for one task's stage.
export function TaskStageBadge({ stage }: { stage: TaskStage }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE[stage]}`}
    >
      {t(STAGE_KEY[stage])}
    </span>
  );
}
