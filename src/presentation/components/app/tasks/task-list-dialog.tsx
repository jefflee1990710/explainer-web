"use client";

import { useEffect, useId } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";

// This video's tasks, opened from the production queue chip.
export function TaskListDialog({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const titleId = useId();
  const { tasks, error, loaded } = useTaskPoll([], videoId);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          <h2 id={titleId} className="font-display text-xl font-bold">
            這支影片的生成任務
          </h2>
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
          {loaded ? (
            <TaskList tasks={tasks} />
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
