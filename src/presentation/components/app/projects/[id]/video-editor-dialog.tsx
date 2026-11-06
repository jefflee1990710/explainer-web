"use client";

import { useEffect, useId } from "react";
import { VideoEditorBreadcrumb } from "@/presentation/components/app/projects/[id]/video-editor-breadcrumb";
import { VideoEditorHeaderStatus } from "@/presentation/components/app/projects/[id]/video-editor-header-status";
import { VideoEditorMoreMenu } from "@/presentation/components/app/projects/[id]/video-editor-more-menu";
import { VideoLocksReferenceButton } from "@/presentation/components/app/projects/[id]/video-locks-reference-button";
import { VideoShareCaptionsButton } from "@/presentation/components/app/projects/[id]/video-share-captions-button";
import { VideoEditorHeaderExportSlot } from "@/presentation/components/app/projects/new/video-edit-summary-end";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LanguageSwitcher } from "@/presentation/components/language-switcher";
import { Spinner } from "@/presentation/components/spinner";
import { RefreshIcon } from "@/presentation/components/project/production-icons";
import { StudioButton } from "@/presentation/studio/studio-button";
import { StudioHint } from "@/presentation/studio/studio-hint";
import { useStudioTheme } from "@/presentation/studio/studio-theme";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoUseCase } from "@/service/video/use-case";

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
  useCase,
  objectSheetUrl,
  objectSheetItems,
  backgroundPlates,
  historyCount,
  onOpenHistory,
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
  useCase?: VideoUseCase;
  objectSheetUrl?: string;
  objectSheetItems?: PublicVideo["objectSheetItems"];
  backgroundPlates?: PublicVideo["backgroundPlates"];
  historyCount?: number;
  onOpenHistory?: () => void;
  children: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const { theme } = useStudioTheme();
  const isEn = locale === "en";
  const historyLabel =
    locale === "zh-Hant" ? "歷史紀錄" : locale === "zh-Hans" ? "历史记录" : "History";
  const titleId = useId();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const showToolPillHeader = !videoId && Boolean(useCase);
  const toolBadge =
    useCase === "talking-head" ? "TALKING" : "EXPLAINER";
  const toolSubtitle =
    useCase === "talking-head"
      ? isEn
        ? "AI Talking-Head Video Studio"
        : locale === "zh-Hans"
          ? "AI 对镜口播工作室"
          : "AI 對鏡口播工作室"
      : isEn
        ? "AI Explainer Video Studio"
        : locale === "zh-Hans"
          ? "AI 解说短片工作室"
          : "AI 解說短片工作室";

  return (
    // Phone: cover the icon rail. md+: sit naturally inside the flex main column beside StudioRail so expanding the rail never covers the page.
    <div
      data-studio-theme={theme}
      className="studio-app fixed inset-0 z-[60] flex flex-col md:relative md:inset-auto md:z-auto md:h-full md:min-h-0 md:w-full md:flex-1"
    >
      <header className="relative z-30 shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)]">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showToolPillHeader ? (
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-[#c6f24b]">
                  {toolBadge}
                </span>
                <h1 id={titleId} className="truncate text-xs font-semibold text-[var(--studio-muted)]">
                  {toolSubtitle}
                </h1>
              </div>
            ) : (
              <VideoEditorBreadcrumb
                folderId={folderId}
                folderName={folderName}
                title={title}
                titleId={titleId}
              />
            )}
          </div>
          <div
            data-opencut-tour="top-right-bar"
            className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2"
          >
            {videoId ? (
              <span data-opencut-tour="header-tasks" className="inline-flex">
                <VideoEditorHeaderStatus videoId={videoId} />
              </span>
            ) : null}
            <span data-opencut-tour="header-locks" className="inline-flex">
              <VideoLocksReferenceButton
                objectSheetUrl={objectSheetUrl}
                objectSheetItems={objectSheetItems}
                backgroundPlates={backgroundPlates}
              />
            </span>
            {videoId ? (
              <span data-opencut-tour="header-captions" className="inline-flex">
                <VideoShareCaptionsButton videoId={videoId} />
              </span>
            ) : null}
            {onRestart ? (
              <StudioHint hint={`${t("video.editor.restart")} · ${t("video.editor.restartHint")}`}>
                <StudioButton
                  variant="ghost"
                  className="w-9 !px-0"
                  onClick={onRestart}
                  aria-label={t("video.editor.restart")}
                  data-opencut-tour="header-restart"
                >
                  <RefreshIcon className="h-4 w-4" />
                </StudioButton>
              </StudioHint>
            ) : null}
            <VideoEditorHeaderExportSlot />
            {onExport ? (
              <StudioButton onClick={onExport}>{t("video.editor.nextExport")}</StudioButton>
            ) : null}
            {syncing ? (
              <p className="inline-flex items-center gap-1.5 rounded-md border border-[var(--studio-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--studio-muted)]">
                <Spinner className="h-3.5 w-3.5" />
                {t("video.editor.syncing")}
              </p>
            ) : null}
            {canDelete && onDelete ? (
              <span data-opencut-tour="header-more" className="inline-flex">
                <VideoEditorMoreMenu onDelete={onDelete} />
              </span>
            ) : null}
            {onOpenHistory ? (
              <button
                type="button"
                onClick={onOpenHistory}
                className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-100 px-3.5 text-xs font-bold text-[#12141c] transition hover:border-zinc-400"
                aria-label={historyLabel}
              >
                <svg
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>{historyLabel}</span>
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-2xl bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-700">
                  {historyCount ?? 0}
                </span>
              </button>
            ) : null}
            {!showToolPillHeader ? <LanguageSwitcher /> : null}
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
