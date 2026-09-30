"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { listTasksOnce } from "@/presentation/components/app/tasks/task-fetch";
import { isTaskRefreshing, subscribeTaskRefresh } from "@/presentation/components/app/tasks/task-refresh";
import { subscribeTaskChanges } from "@/presentation/components/app/tasks/task-signal";
import { Spinner } from "@/presentation/components/spinner";

const POLL_MS = 5_000;

// Queue chip. Opens a menu in the rail; editors pass onOpen.
export function TaskMeter({
  pending: initialPending,
  tasksLabel,
  pendingLabel,
  videoId,
  onOpen,
  ariaExpanded,
  poll = true,
  refreshing = false,
  className: classNameProp,
}: {
  pending: number;
  tasksLabel: string;
  pendingLabel: string;
  // When set, the count is this video only.
  videoId?: string;
  // Open a local list instead of navigating to /app/tasks.
  onOpen?: () => void;
  ariaExpanded?: boolean;
  // False when a parent already polls and passes the live count.
  poll?: boolean;
  // Parent is refetching, or a generate click is still landing in the queue.
  refreshing?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  // Own poll result when polling; otherwise the parent's live count wins.
  const [polled, setPolled] = useState(initialPending);
  const [selfRefreshing, setSelfRefreshing] = useState(false);
  const pending = poll ? polled : initialPending;
  const showRefreshing = refreshing || (poll && selfRefreshing);
  const inFlight = useRef(false);
  const active = !onOpen && (pathname === "/app/tasks" || pathname.startsWith("/app/tasks/"));
  const label = `${tasksLabel}, ${pending} ${pendingLabel}`;
  const busy = pending > 0;
  // Queue chip — not a remaining-balance bar.
  const className = `inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold tabular-nums ${
    classNameProp ?? ""
  } ${
    busy || active
      ? "bg-[var(--studio-cyan-soft)] text-[var(--studio-ink)]"
      : "text-[var(--studio-muted)] hover:bg-[var(--studio-fill)]"
  }`;

  useEffect(() => {
    if (!poll) return;
    let alive = true;
    // A change signal that arrives mid-request queues one more fetch.
    let dirty = false;
    async function tick(advance: boolean) {
      if (inFlight.current) {
        dirty = true;
        return;
      }
      inFlight.current = true;
      setSelfRefreshing(true);
      try {
        const result = await listTasksOnce(videoId, { advance });
        if (!alive || !result.ok) return;
        setPolled(result.tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length);
      } finally {
        inFlight.current = false;
      }
      if (dirty && alive) {
        dirty = false;
        await tick(advance);
        return;
      }
      if (alive) setSelfRefreshing(isTaskRefreshing());
    }
    void tick(false);
    const timer = window.setInterval(() => void tick(true), POLL_MS);
    // Refetch right away when a job is queued or settles anywhere on the page.
    const unsubscribe = subscribeTaskChanges(() => void tick(false));
    const unsubscribeRefresh = subscribeTaskRefresh(() => {
      setSelfRefreshing(isTaskRefreshing() || inFlight.current);
    });
    return () => {
      alive = false;
      window.clearInterval(timer);
      unsubscribe();
      unsubscribeRefresh();
    };
  }, [videoId, poll]);

  const body = (
    <>
      {showRefreshing ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : busy ? (
        <span className="studio-task-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--studio-teal)]" aria-hidden />
      ) : (
        <TasksIcon />
      )}
      <span className="whitespace-nowrap">
        {pending}
        <span className="hidden lg:inline"> {pendingLabel}</span>
      </span>
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={ariaExpanded}
        aria-haspopup="menu"
        aria-label={label}
        className={`cursor-pointer ${className}`}
        aria-busy={busy}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href="/app/tasks" aria-current={active ? "page" : undefined} aria-busy={busy} aria-label={label} className={className}>
      {body}
    </Link>
  );
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" />
    </svg>
  );
}
