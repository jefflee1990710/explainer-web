"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { TaskClockLabel } from "@/presentation/components/app/tasks/task-clock-label";
import { TaskStageBadge } from "@/presentation/components/app/tasks/task-stage-badge";
import type { PublicTask } from "@/service/generation/task-list";
import { translateAppError } from "@/util/i18n/translate-app-error";

// One generation task: preview, what it is, where it stands.
export function TaskRow({ task, clock = false }: { task: PublicTask; clock?: boolean }) {
  const { t, locale } = useI18n();
  const busy = task.stage !== "done" && task.stage !== "failed";
  const time = new Date(task.updatedAt).toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const detail = task.detailKey
    ? t(task.detailKey, task.detailParams)
    : task.detail;
  return (
    <li className="flex items-center gap-3 border-b border-[var(--studio-line)] px-3 py-2.5 last:border-b-0">
      <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--studio-line)] bg-[var(--studio-canvas)]">
        {task.previewUrl ? (
          task.isVideo ? (
            <video
              src={task.previewUrl}
              muted
              playsInline
              preload="metadata"
              controls
              className="h-full w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.previewUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
          )
        ) : busy ? (
          <Spinner className="h-4 w-4 text-[var(--studio-muted)]" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={task.href}
          className="line-clamp-1 text-sm font-semibold text-[var(--studio-ink)] hover:underline"
        >
          {task.title}
        </Link>
        <p className="text-xs text-[var(--studio-muted)]">
          {detail} ·{" "}
          {clock ? (
            <TaskClockLabel
              createdAt={task.createdAt}
              updatedAt={task.updatedAt}
              settled={!busy}
            />
          ) : (
            // Server renders UTC, browser its local zone; let the client text win.
            <time dateTime={task.updatedAt} suppressHydrationWarning>
              {time}
            </time>
          )}
          {task.stage === "queued" && task.attempts > 0
            ? t("tasksPage.attempt", { n: task.attempts + 1 })
            : ""}
        </p>
        {task.error ? (
          <p className="line-clamp-2 text-xs text-accent">{translateAppError(task.error, t)}</p>
        ) : null}
      </div>
      <TaskStageBadge stage={task.stage} />
    </li>
  );
}
