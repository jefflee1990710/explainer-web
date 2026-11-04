"use client";

import { TaskRow } from "@/presentation/components/app/tasks/task-row";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { PublicTask } from "@/service/generation/task-list";

const MAX_SUCCESS_TASKS = 20;

// /app/tasks: shows all pending/running tasks and the last 20 succeeded tasks.
export function TasksView({ initial }: { initial: PublicTask[] }) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const { tasks, error } = useTaskPoll(initial);

  const pendingTasks = tasks.filter(
    (task) => task.stage !== "done" && task.stage !== "failed",
  );
  const successTasks = tasks
    .filter((task) => task.stage === "done")
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_SUCCESS_TASKS);

  return (
    <div className="space-y-8">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold">{t("tasksPage.title")}</h1>
        <p className="mt-2 text-sm text-muted">
          {pendingTasks.length > 0
            ? t("tasksPage.active", { n: pendingTasks.length })
            : t("tasksPage.empty")}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {translateAppError(error, t)}
        </p>
      ) : null}

      {/* Section 1: Pending & Running Tasks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[#12141c]">
            {isEn ? "Pending & Running Tasks" : "進行中與排隊任務"}
          </h2>
          <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 text-xs font-extrabold text-[#c6f24b]">
            {pendingTasks.length}
          </span>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {isEn ? "No pending tasks running right now." : "目前沒有正在執行的任務。"}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)]">
            {pendingTasks.map((task) => (
              <TaskRow key={task.id} task={task} clock />
            ))}
          </ul>
        )}
      </section>

      {/* Section 2: Last 20 Success Tasks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[#12141c]">
            {isEn
              ? `Last ${MAX_SUCCESS_TASKS} Completed Tasks`
              : `最近 ${MAX_SUCCESS_TASKS} 筆已完成任務`}
          </h2>
          <span className="rounded-2xl bg-zinc-200/80 px-2.5 py-0.5 text-xs font-bold text-zinc-700">
            {successTasks.length}
          </span>
        </div>

        {successTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {isEn ? "No completed tasks yet." : "尚無已完成的任務紀錄。"}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)]">
            {successTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
