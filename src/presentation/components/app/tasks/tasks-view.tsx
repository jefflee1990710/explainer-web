"use client";

import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import type { PublicTask } from "@/service/generation/task-list";

// /app/tasks: every image / video task, live.
export function TasksView({ initial }: { initial: PublicTask[] }) {
  const { tasks, error } = useTaskPoll(initial);
  const active = tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
  return (
    <div>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold">生成任務</h1>
        <p className="mt-2 text-sm text-muted">
          {active > 0 ? `${active} 個任務進行中，每 5 秒更新` : "所有任務都已完成"}
        </p>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-accent">
          {error}
        </p>
      ) : null}
      <div className="mt-8">
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
}
