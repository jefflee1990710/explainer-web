"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  ProjectPicker,
  type ProjectOption,
  type ProjectPickerValue,
} from "@/presentation/components/app/project-picker";
import { VideoTable } from "@/presentation/components/app/projects/[id]/video-table";
import type { PublicVideoCard } from "@/presentation/serialize";
import type { VideoUseCase } from "@/service/video/use-case";

export function UseCaseHistoryDialog({
  open,
  onClose,
  useCase,
  videos,
  folders,
}: {
  open: boolean;
  onClose: () => void;
  useCase?: VideoUseCase;
  videos: PublicVideoCard[];
  folders: ProjectOption[];
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const [filter, setFilter] = useState<ProjectPickerValue>("all");
  const [folderOptions, setFolderOptions] = useState(folders);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep picker options in sync with server folder list
    setFolderOptions(folders);
  }, [folders]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title = useMemo(() => {
    if (useCase === "explainer") {
      return locale === "zh-Hant"
        ? "解說短片歷史紀錄 · Explainer History"
        : locale === "zh-Hans"
          ? "解说短片历史记录 · Explainer History"
          : "Explainer Video History";
    }
    if (useCase === "talking-head") {
      return locale === "zh-Hant"
        ? "對鏡口播歷史紀錄 · Talking-Head History"
        : locale === "zh-Hans"
          ? "对镜口播历史记录 · Talking-Head History"
          : "Talking-Head Video History";
    }
    return locale === "zh-Hant"
      ? "歷史影片紀錄 · Video History"
      : locale === "zh-Hans"
        ? "历史视频记录 · Video History"
        : "Video History";
  }, [useCase, locale]);

  const shown = useMemo(() => {
    if (filter === "none") return videos.filter((video) => !video.projectId);
    if (filter === "all") return videos;
    return videos.filter((video) => video.projectId === filter);
  }, [filter, videos]);

  if (!open || typeof document === "undefined") return null;

  const host = document.getElementById("studio-dialog-root") ?? document.body;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[140] grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 id={titleId} className="font-display text-xl font-bold">
              {title}
            </h2>
            <ProjectPicker
              includeAll
              folders={folderOptions}
              value={filter}
              onChange={setFilter}
              onFolderCreated={(folder) =>
                setFolderOptions((cur) => [folder, ...cur])
              }
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {shown.length === 0 ? (
            <p className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 py-10 text-center text-sm text-muted">
              {t("video.list.empty")}
            </p>
          ) : (
            <VideoTable videos={shown} />
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
