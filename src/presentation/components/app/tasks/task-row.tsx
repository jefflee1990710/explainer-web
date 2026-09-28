import Link from "next/link";
import { Spinner } from "@/presentation/components/spinner";
import { TaskStageBadge } from "@/presentation/components/app/tasks/task-stage-badge";
import type { PublicTask } from "@/service/generation/task-list";

// One generation task: preview, what it is, where it stands.
export function TaskRow({ task }: { task: PublicTask }) {
  const busy = task.stage !== "done" && task.stage !== "failed";
  const time = new Date(task.updatedAt).toLocaleString("zh-Hant", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          {task.detail} ·{" "}
          {/* Server renders UTC, browser its local zone; let the client text win. */}
          <time dateTime={task.updatedAt} suppressHydrationWarning>
            {time}
          </time>
          {task.stage === "queued" && task.attempts > 0 ? ` · 第 ${task.attempts + 1} 次嘗試` : ""}
        </p>
        {task.error ? <p className="line-clamp-2 text-xs text-accent">{task.error}</p> : null}
      </div>
      <TaskStageBadge stage={task.stage} />
    </li>
  );
}
