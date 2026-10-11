"use client";

import { useEffect, useId } from "react";
import { VideoEditorBreadcrumb } from "@/presentation/components/app/projects/[id]/video-editor-breadcrumb";
import { VideoEditorHeaderStatus } from "@/presentation/components/app/projects/[id]/video-editor-header-status";
import { VideoEditorMoreMenu } from "@/presentation/components/app/projects/[id]/video-editor-more-menu";
import { VideoLocksReferenceButton } from "@/presentation/components/app/projects/[id]/video-locks-reference-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import type { PublicVideo } from "@/presentation/serialize";

// Full-page editor chrome over the studio shell.
export function VideoEditorDialog({
  folderId,
  folderName,
  title,
  syncing = false,
  canDelete = false,
  onExport,
  onRestart,
  onDelete,
  videoId,
  objectSheetUrl,
  objectSheetItems,
  backgroundPlates,
  children,
}: {
  folderId: string;
  folderName: string;
  title: string;
  syncing?: boolean;
  canDelete?: boolean;
  onExport?: () => void;
  // Shown only when the video can start over (nothing generating).
  onRestart?: () => void;
  onDelete?: () => void;
  // When set, show this video's pending tasks in the header.
  videoId?: string;
  objectSheetUrl?: string;
  objectSheetItems?: PublicVideo["objectSheetItems"];
  backgroundPlates?: PublicVideo["backgroundPlates"];
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
    // Phone: cover the icon rail. md+: sit beside the 72px rail.
    <div className="studio-app fixed inset-0 z-[60] flex flex-col md:inset-y-0 md:right-0 md:left-[72px] md:z-40">
      <header className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)]">
        <div className="flex items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <VideoEditorBreadcrumb
              folderId={folderId}
              folderName={folderName}
              title={title}
              titleId={titleId}
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          {videoId ? <VideoEditorHeaderStatus videoId={videoId} /> : null}
          <VideoLocksReferenceButton
            objectSheetUrl={objectSheetUrl}
            objectSheetItems={objectSheetItems}
            backgroundPlates={backgroundPlates}
          />
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
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
