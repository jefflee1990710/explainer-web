import { TaskRow } from "@/presentation/components/app/tasks/task-row";
import type { PublicTask } from "@/service/generation/task-list";

// Plain list of tasks; empty state when nothing ran yet.
export function TaskList({ tasks }: { tasks: PublicTask[] }) {
  if (tasks.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-[var(--studio-muted)]">目前沒有生成任務。</p>
    );
  }
  return (
    <ul className="rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)]">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}
