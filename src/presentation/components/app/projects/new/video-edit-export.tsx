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

// One export action: download the finished file, or queue a branded render first.
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
  const edited = hasEdit(edit);
  const current = isFinalCurrent(withEdit);
  const busy = isFinalRunning(project) || pending;
  const failed = project.finalStatus === "failed" && !busy && !current;
  const stale = Boolean(project.finalUrl) && !current && edited;
  // Branded file when it matches the edit; otherwise the plain reel is the final cut.
  const fileUrl = current ? project.finalUrl : !edited && reelReady ? project.reelUrl : undefined;
  const basename = baseName(project, t("video.export.fallbackBasename"));

  function saveFinal() {
    if (fileUrl) void download(fileUrl, `${basename}.mp4`);
    else onExport();
  }

  return (
    <section className="space-y-2 border-t border-[var(--studio-line)] pt-4">
      <StudioButton className="w-full" disabled={!reelReady || busy || saving || downloading} onClick={saveFinal}>
        {busy || downloading ? <Spinner className="h-4 w-4" /> : null}
        {busy
          ? t("video.export.exporting")
          : failed
            ? t("video.export.retry")
            : t("video.export.export")}
      </StudioButton>
      {!reelReady ? (
        <p className="text-[11px] text-[var(--studio-muted)]">{t("video.export.waitForReel")}</p>
      ) : null}
      {failed && project.finalError ? (
        <p role="alert" className="text-[11px] text-[#e11d48]">
          {translateAppError(project.finalError, t)}
        </p>
      ) : null}
      {stale && !busy ? (
        <p className="text-[11px] text-[var(--studio-muted)]">{t("video.export.staleHint")}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[11px] text-[#e11d48]">
          {translateAppError(error, t)}
        </p>
      ) : null}
    </section>
  );
}
