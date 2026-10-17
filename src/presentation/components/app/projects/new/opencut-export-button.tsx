"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoEditorHeaderExport } from "@/presentation/components/app/projects/new/video-edit-summary-end";
import { AllFramesVideoIcon } from "@/presentation/components/project/production-bulk-action-icons";
import { Spinner } from "@/presentation/components/spinner";
import {
  AddClipIcon,
  AllFramesIcon,
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

// Sits to the right of 重新開始 and asks the in-page OpenCut editor to render the timeline.
export function OpenCutExportButton({
  project,
  host,
  disabled,
  idle = true,
}: {
  project: PublicVideo;
  host: ScroOpenCutHost;
  disabled: boolean;
  idle?: boolean;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"idle" | "exporting" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const videosEnabled = idle && allFramesReady(project);

  useEffect(() => {
    return host.subscribeScro((payload) => {
      const data = payload as { type?: string; exporting?: boolean; progress?: number };
      if (data?.type === "scro-export-progress" && data.exporting) {
        setPhase("exporting");
        setProgress(typeof data.progress === "number" ? data.progress : 0);
      } else if (data?.type === "scro-export-done") {
        setPhase("idle");
        setProgress(0);
      } else if (data?.type === "scro-export-error") {
        setPhase("error");
        setProgress(0);
      }
    });
  }, [host]);

  function startExport() {
    if (disabled || phase === "exporting") return;
    setPhase("exporting");
    setProgress(0);
    host.postToEditor({
      type: "scro-export",
      filename: exportFilename(project, t("video.export.fallbackBasename")),
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
  const allFramesLabel = t("production.bulk.mode.scenes.label");
  const allVideosLabel = t("production.toolbar.bulkAllVideos");
  const addClipLabel = t("production.filmstrip.addClip");

  return (
    <VideoEditorHeaderExport>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <StudioHint hint={remainingLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!idle}
            aria-label={remainingLabel}
            onClick={() => runClipAction("remaining")}
          >
            <FinishMissingIcon className="h-4 w-4" />
          </StudioButton>
        </StudioHint>
        <StudioHint hint={allFramesLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!idle}
            aria-label={allFramesLabel}
            onClick={() => runClipAction("scenes")}
          >
            <AllFramesIcon className="h-4 w-4" />
          </StudioButton>
        </StudioHint>
        <StudioHint hint={allVideosLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!videosEnabled}
            aria-label={allVideosLabel}
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
            onClick={() => runClipAction("add")}
          >
            <AddClipIcon className="h-4 w-4" />
          </StudioButton>
        </StudioHint>
        <StudioHint hint={disabled ? t("video.export.waitForClips") : t("video.export.hint")}>
          <button
            type="button"
            onClick={startExport}
            disabled={disabled || phase === "exporting"}
            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#12141c] px-3.5 text-sm font-semibold text-[#c6f24b] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "exporting" ? <Spinner className="h-3.5 w-3.5" /> : <DownloadIcon />}
            {label}
          </button>
        </StudioHint>
      </div>
    </VideoEditorHeaderExport>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M8 2.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.2 7.2 8 10l2.8-2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 13h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
