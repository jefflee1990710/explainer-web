"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { isProjectReady } from "@/service/clip-stage";
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
  onExport,
}: {
  project: PublicVideo;
  edit: VideoEdit;
  saving: boolean;
  pending: boolean;
  error?: string;
  onExport: (existingUrl: string | undefined, filename: string) => void;
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

  function saveFinal() {
    onExport(fileUrl, `${basename}.mp4`);
  }

  return (
    <div className="flex items-center gap-2">
      {shownError ? (
        <p role="alert" className="max-w-48 truncate text-[11px] font-medium text-[#e11d48]">
          {translateAppError(shownError, t)}
        </p>
      ) : stale && !busy ? (
        <p className="max-w-40 truncate text-[11px] text-[var(--studio-muted)]">{t("video.export.staleHint")}</p>
      ) : !clipsReady ? (
        <p className="max-w-40 truncate text-[11px] text-[var(--studio-muted)]">{t("video.export.waitForClips")}</p>
      ) : null}
      <button
        type="button"
        disabled={!clipsReady || busy || saving}
        onClick={saveFinal}
        className="inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#12141c] px-3 text-xs font-semibold text-[#c6f24b] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
        {busy
          ? t("video.export.exporting")
          : failed
            ? t("video.export.retry")
            : t("video.export.export")}
      </button>
    </div>
  );
}
