import { TaskRow } from "@/presentation/components/app/tasks/task-row";
import { visibleTasks } from "@/presentation/components/app/tasks/visible-tasks";
import type { PublicTask } from "@/service/generation/task-list";

// In-flight tasks, plus the five most recently finished. Older history stays off this list.
export function TaskList({ tasks, clock = false }: { tasks: PublicTask[]; clock?: boolean }) {
  const shown = visibleTasks(tasks);
  if (shown.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-[var(--studio-muted)]">
        目前沒有進行中或剛完成的任務。
      </p>
    );
  }
  return (
    <ul className="rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)]">
      {shown.map((task) => (
        <TaskRow key={task.id} task={task} clock={clock} />
      ))}
    </ul>
  );
}
