"use client";

import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { PublicTask } from "@/service/generation/task-list";

// /app/tasks: in-flight jobs plus ones that just settled.
export function TasksView({ initial }: { initial: PublicTask[] }) {
  const { t } = useI18n();
  const { tasks, error } = useTaskPoll(initial);
  const active = tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
  return (
    <div>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold">{t("tasksPage.title")}</h1>
        <p className="mt-2 text-sm text-muted">
          {active > 0 ? t("tasksPage.active", { n: active }) : t("tasksPage.empty")}
        </p>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-accent">
          {translateAppError(error, t)}
        </p>
      ) : null}
      <div className="mt-8">
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
}
