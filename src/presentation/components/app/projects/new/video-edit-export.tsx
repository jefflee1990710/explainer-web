"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { useFileDownload } from "@/presentation/components/app/projects/new/use-file-download";
import { isReelCurrent } from "@/service/reel/fingerprint";
import { hasEdit, isFinalCurrent, isFinalRunning } from "@/service/video-edit/edit-state";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";
import { translateAppError } from "@/util/i18n/translate-app-error";

function baseName(project: PublicVideo, fallback: string) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || fallback;
  return raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || fallback;
}

// Export / download state for the branded file, with the plain reel as fallback.
export function VideoEditExport({
  project,
  edit,
  saving,
  pending,
  onExport,
}: {
  project: PublicVideo;
  edit: VideoEdit;
  saving: boolean;
  pending: boolean;
  onExport: () => void;
}) {
  const { t } = useI18n();
  const { saving: downloading, error, download } = useFileDownload();
  const reelReady = isReelCurrent(project);
  const withEdit = { ...project, edit };
  const current = isFinalCurrent(withEdit);
  const busy = isFinalRunning(project) || pending;
  const failed = project.finalStatus === "failed" && !busy;
  const stale = Boolean(project.finalUrl) && !current;
  const edited = hasEdit(edit);
  const basename = baseName(project, t("video.export.fallbackBasename"));

  return (
    <section className="space-y-2 border-t border-[var(--studio-line)] pt-4">
      {edited ? (
        <StudioButton className="w-full" disabled={!reelReady || busy || saving || current} onClick={onExport}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {busy
            ? t("video.export.exporting")
            : current
              ? t("video.export.upToDate")
              : failed
                ? t("video.export.retry")
                : t("video.export.export")}
        </StudioButton>
      ) : null}
      {!reelReady ? (
        <p className="text-[11px] text-[var(--studio-muted)]">{t("video.export.waitForReel")}</p>
      ) : null}
      {failed && project.finalError ? (
        <p role="alert" className="text-[11px] text-[#e11d48]">
          {translateAppError(project.finalError, t)}
        </p>
      ) : null}
      {edited && project.finalUrl ? (
        <StudioButton
          variant="ghost"
          className="w-full"
          disabled={downloading}
          onClick={() => void download(project.finalUrl!, `${basename}.mp4`)}
        >
          {downloading ? <Spinner className="h-4 w-4" /> : null}
          {stale ? t("video.export.downloadStale") : t("video.export.download")}
        </StudioButton>
      ) : null}
      {stale && !busy ? (
        <p className="text-[11px] text-[var(--studio-muted)]">{t("video.export.staleHint")}</p>
      ) : null}
      {project.reelUrl && reelReady ? (
        <button
          type="button"
          disabled={downloading}
          onClick={() => void download(project.reelUrl!, `${basename}${t("video.export.plainReelSuffix")}`)}
          className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline"
        >
          {t("video.export.downloadPlainReel")}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-[11px] text-[#e11d48]">
          {translateAppError(error, t)}
        </p>
      ) : null}
    </section>
  );
}
