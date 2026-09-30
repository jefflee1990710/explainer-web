"use client";

import { useEffect, useId } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import type { PublicTask } from "@/service/generation/task-list";

// This video's tasks, opened from the production queue chip.
export function TaskListDialog({
  videoId,
  onClose,
  tasks: seededTasks,
  loaded: seededLoaded,
  refreshing: seededRefreshing,
  error: seededError,
}: {
  videoId: string;
  onClose: () => void;
  // Parent already polling — reuse those rows so the dialog does not spin.
  tasks?: PublicTask[];
  loaded?: boolean;
  refreshing?: boolean;
  error?: string;
}) {
  const titleId = useId();
  const ownPoll = seededTasks === undefined;
  const polled = useTaskPoll(readCachedTasks(videoId) ?? [], videoId, ownPoll);
  const tasks = seededTasks ?? polled.tasks;
  const loaded = seededLoaded ?? polled.loaded;
  const refreshing = seededRefreshing ?? polled.refreshing;
  const error = seededError ?? polled.error;
  const pending = tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              這支影片的生成任務
            </h2>
            <p className="mt-1 text-sm text-muted">
              {refreshing
                ? pending > 0
                  ? `更新中… ${pending} 個進行中`
                  : "更新中…"
                : loaded
                  ? pending > 0
                    ? `${pending} 個進行中`
                    : "沒有進行中的任務"
                  : "載入中…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-sm font-semibold text-muted transition hover:text-foreground"
          >
            關閉
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-accent">
            {error}
          </p>
        ) : null}
        <div className="mt-4">
          {loaded || tasks.length > 0 ? (
            <TaskList tasks={tasks} clock />
          ) : (
            <div className="grid place-items-center py-8 text-[var(--studio-muted)]">
              <Spinner className="h-5 w-5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
