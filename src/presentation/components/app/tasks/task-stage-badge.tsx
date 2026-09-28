import type { TaskStage } from "@/service/generation/task-list";

const LABEL: Record<TaskStage, string> = {
  queued: "排隊中",
  sending: "送出中",
  generating: "生成中",
  done: "完成",
  failed: "失敗",
};

const TONE: Record<TaskStage, string> = {
  queued: "text-[var(--studio-muted)] border-[var(--studio-line)]",
  sending: "text-[var(--studio-teal)] border-[var(--studio-teal)]/40",
  generating: "text-[var(--studio-teal)] border-[var(--studio-teal)]/40",
  done: "text-[var(--studio-ink)] border-[var(--studio-line)]",
  failed: "text-accent border-accent/40",
};

// Small pill for one task's stage.
export function TaskStageBadge({ stage }: { stage: TaskStage }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE[stage]}`}
    >
      {LABEL[stage]}
    </span>
  );
}
