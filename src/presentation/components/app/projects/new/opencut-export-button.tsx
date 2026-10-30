"use client";

import { useEffect, useState } from "react";
import { track } from "@/presentation/components/analytics/track";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoEditorHeaderExport } from "@/presentation/components/app/projects/new/video-edit-summary-end";
import { Spinner } from "@/presentation/components/spinner";
import { AllFramesVideoIcon } from "@/presentation/components/project/production-bulk-action-icons";
import { OpenCutSaveIndicator } from "@/presentation/components/app/projects/new/opencut-save-indicator";
import {
  AddClipIcon,
  FinishMissingIcon,
} from "@/presentation/studio/studio-action-icons";
import { StudioButton } from "@/presentation/studio/studio-button";
import { StudioHint } from "@/presentation/studio/studio-hint";
import { allFramesReady } from "@/service/production-plan";
import type { ScroClipMenuAction } from "@/opencut/embed/scro-video-actions";
import type { ScroOpenCutHost } from "@/service/opencut/host-channel";
import type { PublicVideo } from "@/presentation/serialize";

function exportFilename(project: PublicVideo, fallback: string) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || fallback;
  const base = raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || fallback;
  return `${base}.mp4`;
}

// Sits to the right of 重新開始 and asks the in-page OpenCut editor to render the timeline as an MP4 download.
export function OpenCutExportButton({
  project,
  host,
  disabled,
  idle = true,
  saving = false,
  onOpenTutorial,
}: {
  project: PublicVideo;
  host: ScroOpenCutHost;
  disabled: boolean;
  idle?: boolean;
  saving?: boolean;
  onOpenTutorial?: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"idle" | "exporting" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const videosEnabled = idle && allFramesReady(project);

  useEffect(() => {
    return host.subscribeScro((payload) => {
      const data = payload as {
        type?: string;
        exporting?: boolean;
        progress?: number;
      };
      if (data?.type === "scro-export-progress" && data.exporting) {
        setPhase("exporting");
        setProgress(typeof data.progress === "number" ? data.progress : 0);
      } else if (data?.type === "scro-export-done") {
        track("opencut_export_done", { videoId: project.id });
        setPhase("idle");
        setProgress(0);
      } else if (data?.type === "scro-export-error") {
        track("opencut_export_error", { videoId: project.id });
        setPhase("error");
        setProgress(0);
      }
    });
  }, [host, project.id]);

  function startExport() {
    if (disabled || phase === "exporting") return;
    setPhase("exporting");
    setProgress(0);
    const filename = exportFilename(project, t("video.export.fallbackBasename"));
    track("opencut_export_started", { videoId: project.id });
    host.postToEditor({
      type: "scro-export",
      filename: filename.toLowerCase().endsWith(".mp4") ? filename : `${filename}.mp4`,
      targetId: "download",
      skipDownload: false,
    });
  }

  function runClipAction(action: ScroClipMenuAction) {
    host.postToScro({
      type: "scro-clip-menu",
      videoId: project.id,
      action,
    });
  }

  const label =
    phase === "exporting"
      ? progress > 0
        ? t("video.export.percent", { n: Math.round(progress * 100) })
        : t("video.export.exporting")
      : phase === "error"
        ? t("video.export.retry")
        : t("video.export.export");

  const remainingLabel = t("production.bulk.mode.remaining.label");
  const allVideosLabel = t("production.toolbar.bulkAllVideos");
  const addClipLabel = t("production.filmstrip.addClip");

  return (
    <VideoEditorHeaderExport>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span data-opencut-tour="header-save" className="inline-flex">
          <OpenCutSaveIndicator saving={saving} />
        </span>
        <StudioHint hint={remainingLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!idle}
            aria-label={remainingLabel}
            data-opencut-tour="header-finish-missing"
            onClick={() => runClipAction("remaining")}
          >
            <FinishMissingIcon className="h-4 w-4" />
          </StudioButton>
        </StudioHint>
        <StudioHint hint={allVideosLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!videosEnabled}
            aria-label={allVideosLabel}
            data-opencut-tour="header-all-videos"
            onClick={() => runClipAction("clips")}
          >
            <AllFramesVideoIcon />
          </StudioButton>
        </StudioHint>
        <StudioHint hint={addClipLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!idle}
            aria-label={addClipLabel}
            data-opencut-tour="header-add-clip"
            onClick={() => runClipAction("add")}
          >
            <AddClipIcon className="h-4 w-4" />
          </StudioButton>
        </StudioHint>
        <button
          type="button"
          title={disabled ? t("video.export.waitForClips") : t("video.export.hint")}
          disabled={disabled || phase === "exporting"}
          data-opencut-tour="header-export-video"
          onClick={startExport}
          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#12141c] px-3.5 text-sm font-semibold text-[#c6f24b] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "exporting" ? <Spinner className="h-3.5 w-3.5" /> : <DownloadArrowIcon />}
          <span>{label}</span>
        </button>
        {onOpenTutorial ? (
          <StudioHint hint="查看編輯器操作導覽 · Editor Tour">
            <button
              type="button"
              onClick={onOpenTutorial}
              aria-label="OpenCut Editor Tour"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--studio-line)] bg-[var(--studio-fill)] font-display text-xs font-bold text-[var(--studio-muted)] transition hover:border-[var(--studio-ink)] hover:text-[var(--studio-ink)]"
            >
              ?
            </button>
          </StudioHint>
        ) : null}
      </div>
    </VideoEditorHeaderExport>
  );
}

function DownloadArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <path d="M8 2.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5.2 7.2 8 10l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 13h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
