"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { listTasksOnce } from "@/presentation/components/app/tasks/task-fetch";
import { subscribeTaskChanges } from "@/presentation/components/app/tasks/task-signal";

const POLL_MS = 5_000;

// Pending count plus a live progress track. The header opens a menu; editors pass onOpen.
export function TaskMeter({
  pending: initialPending,
  tasksLabel,
  pendingLabel,
  videoId,
  onOpen,
  ariaExpanded,
  poll = true,
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
}) {
  const pathname = usePathname();
  // Own poll result when polling; otherwise the parent's live count wins.
  const [polled, setPolled] = useState(initialPending);
  const pending = poll ? polled : initialPending;
  const inFlight = useRef(false);
  const active = !onOpen && (pathname === "/app/tasks" || pathname.startsWith("/app/tasks/"));
  const label = `${tasksLabel}, ${pending} ${pendingLabel}`;
  const className = `flex min-w-28 flex-col gap-1 rounded-md border px-2.5 py-1 ${
    active
      ? "border-[var(--studio-teal)]/40 bg-[var(--studio-cyan-soft)]"
      : "border-[var(--studio-line)] bg-[var(--studio-panel)] hover:bg-[var(--studio-fill)]"
  }`;

  useEffect(() => {
    if (!poll) return;
    let alive = true;
    // A change signal that arrives mid-request queues one more fetch.
    let dirty = false;
    async function tick() {
      if (inFlight.current) {
        dirty = true;
        return;
      }
      inFlight.current = true;
      try {
        const result = await listTasksOnce(videoId);
        if (!alive || !result.ok) return;
        setPolled(result.tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length);
      } finally {
        inFlight.current = false;
      }
      if (dirty && alive) {
        dirty = false;
        void tick();
      }
    }
    void tick();
    const timer = window.setInterval(tick, POLL_MS);
    // Refetch right away when a job is queued or settles anywhere on the page.
    const unsubscribe = subscribeTaskChanges(() => void tick());
    return () => {
      alive = false;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [videoId, poll]);

  const body = (
    <>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold tabular-nums">
        <TasksIcon />
        {pending} {pendingLabel}
      </span>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--studio-line)]"
        role="progressbar"
        aria-label={pendingLabel}
        aria-valuemin={0}
        aria-valuenow={pending}
        aria-busy={pending > 0}
      >
        {pending > 0 ? (
          <div className="studio-task-meter-bar h-full w-1/3 rounded-full bg-[var(--studio-teal)]" />
        ) : null}
      </div>
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
      >
        {body}
      </button>
    );
  }

  return (
    <Link href="/app/tasks" aria-current={active ? "page" : undefined} aria-label={label} className={className}>
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
