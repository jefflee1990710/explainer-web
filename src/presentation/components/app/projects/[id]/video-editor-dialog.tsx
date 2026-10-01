"use client";

import { useEffect, useId } from "react";
import { VideoEditorHeaderStatus } from "@/presentation/components/app/projects/[id]/video-editor-header-status";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";

// Full-page overlay so the existing video editor can fill the workspace.
export function VideoEditorDialog({
  title,
  nav,
  syncing = false,
  canDelete = false,
  onExport,
  onRestart,
  onClose,
  onDelete,
  videoId,
  credits,
  creditLimit,
  children,
}: {
  title: string;
  nav?: React.ReactNode;
  syncing?: boolean;
  canDelete?: boolean;
  onExport?: () => void;
  // Shown only when the video can start over (nothing generating).
  onRestart?: () => void;
  onClose: () => void;
  onDelete?: () => void;
  // When set, show this video's pending tasks and credit meter in the header.
  videoId?: string;
  credits?: number;
  creditLimit?: number;
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
          {credits !== undefined && creditLimit !== undefined ? (
            <VideoEditorHeaderStatus videoId={videoId} credits={credits} creditLimit={creditLimit} />
          ) : null}
          {onRestart ? (
            <StudioButton variant="ghost" onClick={onRestart}>
              重新開始
            </StudioButton>
          ) : null}
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
            <StudioButton variant="danger" onClick={onDelete}>
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
