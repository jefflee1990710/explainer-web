"use client";

import { useEffect, useRef, useState } from "react";
import {
  queueBannerMessage,
  queueBannerPending,
  shouldShowQueueBanner,
} from "@/presentation/components/app/tasks/queue-banner-copy";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicTask } from "@/service/generation/task-list";

function isQueued(task: PublicTask) {
  return task.stage !== "done" && task.stage !== "failed";
}

// Sticky top bar. Hidden unless something is still queued or running.
export function TaskQueueBanner({ initialPending }: { initialPending: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { tasks, error, loaded, refreshing } = useTaskPoll(readCachedTasks() ?? [], undefined, true);
  const queued = tasks.filter(isQueued);
  const pending = queueBannerPending(queued.length, loaded, initialPending);
  const message = queueBannerMessage(queued, pending, t("common.pending"));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!shouldShowQueueBanner(pending)) return null;

  return (
    <div ref={rootRef} className="sticky top-0 z-30 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-busy={refreshing}
        aria-label={`${t("nav.tasks")}, ${pending} ${t("common.pending")}`}
        className="flex w-full cursor-pointer items-center justify-center gap-2 bg-[var(--accent-ink)] px-4 py-2 text-sm font-semibold text-[var(--lime)]"
      >
        {refreshing ? <Spinner className="h-3.5 w-3.5" /> : <span className="studio-task-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lime)]" aria-hidden />}
        <span className="min-w-0 truncate text-center">{message}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-40 mt-0 w-[min(32rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-b-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-2 shadow-lg"
        >
          <p className="px-2 py-1.5 text-xs font-semibold text-[var(--studio-muted)]">
            {t("tasksMenu.title")}
          </p>
          {error ? (
            <p role="alert" className="px-2 py-2 text-sm text-accent">
              {error}
            </p>
          ) : (
            <TaskList tasks={queued} />
          )}
        </div>
      ) : null}
    </div>
  );
}
