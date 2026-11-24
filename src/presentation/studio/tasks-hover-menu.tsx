"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/presentation/components/spinner";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Delay before closing so the pointer can travel from the button into the panel.
const CLOSE_DELAY_MS = 180;

// Header "Tasks" entry: hover (or click) opens a task dropdown instead of leaving the page.
export function TasksHoverMenu({
  label,
  badge = 0,
  active,
}: {
  label: string;
  badge?: number;
  active: boolean;
}) {
  const { t, locale } = useI18n();
  const isZh = locale !== "en";
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Fixed under the header so the list sits below the bar and above the page.
  const [anchor, setAnchor] = useState<{ top: number; right: number; bridge: number; width: number } | null>(null);

  function place() {
    const button = buttonRef.current;
    const header = button?.closest("header");
    if (!button || !header) return;
    const buttonRect = button.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    setAnchor({
      top: headerRect.bottom,
      right: Math.max(8, window.innerWidth - buttonRect.right),
      bridge: Math.max(0, headerRect.bottom - buttonRect.bottom),
      width: buttonRect.width,
    });
  }

  function cancelClose() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }
  function openNow() {
    cancelClose();
    place();
    setOpen(true);
  }
  function closeSoon() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  // Escape and clicks outside close the panel (touch devices have no hover-out).
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onLayout() {
      place();
    }
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <div ref={rootRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openNow())}
        className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition ${
          active || open
            ? "bg-[var(--studio-fill)] text-[var(--studio-ink)]"
            : "text-[var(--studio-muted)] hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)]"
        }`}
      >
        <span>{label}</span>
        {badge > 0 ? (
          <span className="grid min-w-5 place-items-center rounded-full bg-[#c6f24b] px-1.5 text-[10px] font-bold text-[#12141c]">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
      {open && anchor ? (
        <>
          {/* Keeps hover alive across the header padding under the button. */}
          <div className="fixed z-[90]" style={{ top: anchor.top - anchor.bridge, right: anchor.right, height: anchor.bridge + 12, width: anchor.width }} />
          <TasksPanel anchor={anchor} isZh={isZh} onNavigate={() => setOpen(false)} t={t} />
        </>
      ) : null}
    </div>
  );
}

// Dropdown body; mounted only while open so polling stops when it closes.
function TasksPanel({
  anchor,
  isZh,
  onNavigate,
  t,
}: {
  anchor: { top: number; right: number };
  isZh: boolean;
  onNavigate: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const { tasks, loaded, error } = useTaskPoll(readCachedTasks() ?? []);
  const pending = tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;

  return (
    <div className="fixed z-[90] pt-1.5" style={{ top: anchor.top, right: anchor.right }}>
      <div
        role="dialog"
        aria-label={t("nav.tasks")}
        className="flex max-h-[min(560px,75vh)] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--studio-line)] px-3 py-2.5">
          <p className="text-sm font-semibold text-[var(--studio-ink)]">
            {pending > 0 ? t("tasksPage.active", { n: pending }) : t("nav.tasks")}
          </p>
          <Link
            href="/app/tasks"
            onClick={onNavigate}
            className="text-xs font-semibold text-[var(--studio-muted)] transition hover:text-[var(--studio-ink)]"
          >
            {isZh ? "查看全部" : "View all"}
          </Link>
        </div>
        {error ? (
          <p role="alert" className="px-3 pt-2 text-xs text-accent">
            {translateAppError(error, t)}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-2" onClick={(event) => {
          // Following a task link closes the menu.
          if ((event.target as HTMLElement).closest("a")) onNavigate();
        }}>
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
