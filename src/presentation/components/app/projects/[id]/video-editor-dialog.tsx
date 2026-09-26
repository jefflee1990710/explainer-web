"use client";

import { useEffect, useId } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";

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
      className="studio-app fixed inset-0 z-40 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 id={titleId} className="font-display text-xl font-bold">
            {title}
          </h2>
          {nav}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onExport ? (
            <StudioButton onClick={onExport}>下一步：成片</StudioButton>
          ) : null}
          {syncing ? (
            <p className="inline-flex items-center gap-1.5 rounded-md border border-[var(--studio-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--studio-muted)]">
              <Spinner className="h-3.5 w-3.5" />
              同步中
            </p>
          ) : null}
          {canDelete ? (
            <StudioButton variant="ghost" className="text-accent" onClick={onDelete}>
              刪除影片
            </StudioButton>
          ) : null}
          <StudioButton variant="ghost" onClick={onClose}>
            關閉
          </StudioButton>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
