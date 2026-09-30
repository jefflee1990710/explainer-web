"use client";

import { useEffect, useRef, useState } from "react";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { TaskMeter } from "@/presentation/studio/task-meter";
import type { PublicTask } from "@/service/generation/task-list";

function isQueued(task: PublicTask) {
  return task.stage !== "done" && task.stage !== "failed";
}

// Header meter. Opens the queued-task list in place instead of leaving the page.
export function HeaderTaskMenu({ initialPending }: { initialPending: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { tasks, error, loaded } = useTaskPoll(readCachedTasks() ?? [], undefined, true);
  const queued = tasks.filter(isQueued);
  const pending = loaded ? queued.length : initialPending;

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

  return (
    <div ref={rootRef} className="relative">
      <TaskMeter
        pending={pending}
        poll={false}
        tasksLabel={t("nav.tasks")}
        pendingLabel={t("common.pending")}
        ariaExpanded={open}
        onOpen={() => setOpen((value) => !value)}
      />
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-2 shadow-lg"
        >
          <p className="px-2 py-1.5 text-xs font-semibold text-[var(--studio-muted)]">
            {t("tasksMenu.title")}
          </p>
          {error ? (
            <p role="alert" className="px-2 py-2 text-sm text-accent">
              {error}
            </p>
          ) : null}
          {queued.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-[var(--studio-muted)]">
              {loaded ? t("tasksMenu.empty") : "…"}
            </p>
          ) : (
            <TaskList tasks={queued} />
          )}
        </div>
      ) : null}
    </div>
  );
}
