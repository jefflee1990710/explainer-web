"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoEditExportMenu } from "@/presentation/components/app/projects/new/video-edit-export-menu";
import { isProjectReady } from "@/service/clip-stage";
import { isReelBusy } from "@/service/reel/fingerprint";
import { hasEdit, isFinalCurrent, isFinalRunning } from "@/service/video-edit/edit-state";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";
import { translateAppError } from "@/util/i18n/translate-app-error";

function baseName(project: PublicVideo, fallback: string) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || fallback;
  return raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || fallback;
}

// Compact export control for the brief summary row.
export function VideoEditExportBar({
  project,
  edit,
  saving,
  pending,
  error,
  onVideoOnly,
  onVideoAndCover,
}: {
  project: PublicVideo;
  edit: VideoEdit;
  saving: boolean;
  pending: boolean;
  error?: string;
  onVideoOnly: (existingUrl: string | undefined, filename: string) => void;
  onVideoAndCover: (existingUrl: string | undefined, filename: string) => void;
}) {
  const { t } = useI18n();
  const clipsReady = isProjectReady(project);
  const withEdit = { ...project, edit };
  const edited = hasEdit(edit);
  const current = isFinalCurrent(withEdit);
  const busy = isFinalRunning(project) || pending;
  const failed = project.finalStatus === "failed" && !busy && !current;
  const stale = Boolean(project.finalUrl) && !current && edited;
  const fileUrl = current ? project.finalUrl : undefined;
  const basename = baseName(project, t("video.export.fallbackBasename"));
  const shownError = error || (failed ? project.finalError : undefined);

  const filename = `${basename}.mp4`;
  const reelStep = isReelBusy(project.reelStatus) ? project.reelStep : undefined;
  const reelPercent = reelStep
    ? Math.round(((reelStep.phase === "join" ? reelStep.current : Math.max(0, reelStep.current - 1)) / Math.max(1, reelStep.total)) * 100)
    : 0;

  return (
    <div className="flex items-center gap-2">
      {reelStep ? (
        <div className="w-36">
          <p className="truncate text-[11px] font-medium text-[var(--studio-ink)]">
            {t(reelStep.phase === "download" ? "video.export.stepDownload" : "video.export.stepJoin", reelStep)}
          </p>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--studio-fill)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={reelPercent}
          >
            <div className="h-full rounded-full bg-lime" style={{ width: `${reelPercent}%` }} />
          </div>
        </div>
      ) : null}
      {shownError ? (
        <p role="alert" className="max-w-48 truncate text-[11px] font-medium text-[#e11d48]">
          {translateAppError(shownError, t)}
        </p>
      ) : stale && !busy ? (
        <p className="max-w-40 truncate text-[11px] text-[var(--studio-muted)]">{t("video.export.staleHint")}</p>
      ) : !clipsReady ? (
        <p className="max-w-40 truncate text-[11px] text-[var(--studio-muted)]">{t("video.export.waitForClips")}</p>
      ) : null}
      <VideoEditExportMenu
        label={
          busy
            ? t("video.export.exporting")
            : failed
              ? t("video.export.retry")
              : t("video.export.export")
        }
        busy={busy}
        disabled={!clipsReady || busy || saving}
        onVideoOnly={() => onVideoOnly(fileUrl, filename)}
        onVideoAndCover={() => onVideoAndCover(fileUrl, filename)}
      />
    </div>
  );
}
