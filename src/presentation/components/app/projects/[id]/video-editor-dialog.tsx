"use client";

import { useEffect, useId } from "react";
import { Spinner } from "@/presentation/components/spinner";

// Full-page overlay so the existing video editor can fill the workspace.
export function VideoEditorDialog({
  title,
  nav,
  syncing = false,
  canDelete = false,
  onExport,
  onClose,
  onDelete,
  children,
}: {
  title: string;
  nav?: React.ReactNode;
  syncing?: boolean;
  canDelete?: boolean;
  onExport?: () => void;
  onClose: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-paper"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 bg-paper/95 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 id={titleId} className="font-display text-xl font-bold sm:text-2xl">
            {title}
          </h2>
          {nav}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
            >
              下一步：成片
            </button>
          ) : null}
          {syncing ? (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-accent-ink/10 bg-paper px-2.5 py-1 text-[11px] font-semibold text-muted">
              <Spinner className="h-3.5 w-3.5" />
              同步中
            </p>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent/30 px-4 text-sm font-semibold text-accent transition hover:-translate-y-0.5"
            >
              刪除影片
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent-ink/15 px-4 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            關閉
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
