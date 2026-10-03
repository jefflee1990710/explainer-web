"use client";

import { useEffect, useId } from "react";
import { VideoEditorBrandBack } from "@/presentation/components/app/projects/[id]/video-editor-brand-back";
import { VideoEditorHeaderStatus } from "@/presentation/components/app/projects/[id]/video-editor-header-status";
import { VideoEditorMoreMenu } from "@/presentation/components/app/projects/[id]/video-editor-more-menu";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";

// Full-page editor chrome over the studio shell.
export function VideoEditorDialog({
  folderId,
  title,
  nav,
  syncing = false,
  canDelete = false,
  onExport,
  onRestart,
  onDelete,
  videoId,
  credits,
  creditLimit,
  children,
}: {
  folderId: string;
  title: string;
  nav?: React.ReactNode;
  syncing?: boolean;
  canDelete?: boolean;
  onExport?: () => void;
  // Shown only when the video can start over (nothing generating).
  onRestart?: () => void;
  onDelete?: () => void;
  // When set, show this video's pending tasks and credit meter in the header.
  videoId?: string;
  credits?: number;
  creditLimit?: number;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="studio-app fixed inset-0 z-40 flex flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <VideoEditorBrandBack folderId={folderId} />
          <h1 id={titleId} className="font-display text-xl font-bold">
            {title}
          </h1>
          {nav}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {credits !== undefined && creditLimit !== undefined ? (
            <VideoEditorHeaderStatus videoId={videoId} credits={credits} creditLimit={creditLimit} />
          ) : null}
          {onRestart ? (
            <StudioButton variant="ghost" onClick={onRestart}>
              {t("video.editor.restart")}
            </StudioButton>
          ) : null}
          {onExport ? (
            <StudioButton onClick={onExport}>{t("video.editor.nextExport")}</StudioButton>
          ) : null}
          {syncing ? (
            <p className="inline-flex items-center gap-1.5 rounded-md border border-[var(--studio-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--studio-muted)]">
              <Spinner className="h-3.5 w-3.5" />
              {t("video.editor.syncing")}
            </p>
          ) : null}
          {canDelete && onDelete ? <VideoEditorMoreMenu onDelete={onDelete} /> : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
