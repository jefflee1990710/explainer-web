"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { isProjectReady } from "@/service/clip-stage";
import { hasEdit, isFinalCurrent, isFinalRunning } from "@/service/video-edit/edit-state";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";
import { translateAppError } from "@/util/i18n/translate-app-error";

function baseName(project: PublicVideo, fallback: string) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || fallback;
  return raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || fallback;
}

// Download a finished file, or render layers and bookends in the browser.
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
  // Only reuse a branded file that already matches this edit.
  const fileUrl = current ? project.finalUrl : undefined;
  const basename = baseName(project, t("video.export.fallbackBasename"));

  function saveFinal() {
    onExport(fileUrl, `${basename}.mp4`);
  }

  return (
    <section className="space-y-2 border-t border-[var(--studio-line)] pt-4">
      <StudioButton className="w-full" disabled={!clipsReady || busy || saving} onClick={saveFinal}>
        {busy ? <Spinner className="h-4 w-4" /> : null}
        {busy
          ? t("video.export.exporting")
          : failed
            ? t("video.export.retry")
            : t("video.export.export")}
      </StudioButton>
      {!clipsReady ? (
        <p className="text-[11px] text-[var(--studio-muted)]">{t("video.export.waitForClips")}</p>
      ) : null}
      {failed && project.finalError ? (
        <p role="alert" className="text-[11px] text-[#e11d48]">
          {translateAppError(project.finalError, t)}
        </p>
      ) : null}
      {stale && !busy ? (
        <p className="text-[11px] text-[var(--studio-muted)]">{t("video.export.staleHint")}</p>
      ) : null}
    </section>
  );
}
