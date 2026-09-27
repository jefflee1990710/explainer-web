"use client";

import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { useFileDownload } from "@/presentation/components/app/projects/new/use-file-download";
import { isReelCurrent } from "@/service/reel/fingerprint";
import { hasEdit, isFinalCurrent, isFinalRunning } from "@/service/video-edit/edit-state";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

function baseName(project: PublicVideo) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || "video";
  return raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || "video";
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
  const { saving: downloading, error, download } = useFileDownload();
  const reelReady = isReelCurrent(project);
  const withEdit = { ...project, edit };
  const current = isFinalCurrent(withEdit);
  const busy = isFinalRunning(project) || pending;
  const failed = project.finalStatus === "failed" && !busy;
  const stale = Boolean(project.finalUrl) && !current;
  const edited = hasEdit(edit);

  return (
    <section className="space-y-2 border-t border-[var(--studio-line)] pt-4">
      {edited ? (
        <StudioButton className="w-full" disabled={!reelReady || busy || saving || current} onClick={onExport}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {busy ? "匯出中…" : current ? "已是最新版本" : failed ? "重新匯出" : "匯出影片"}
        </StudioButton>
      ) : null}
      {!reelReady ? <p className="text-[11px] text-[var(--studio-muted)]">成片合成中，完成後再匯出。</p> : null}
      {failed && project.finalError ? <p role="alert" className="text-[11px] text-[#e11d48]">{project.finalError}</p> : null}
      {edited && project.finalUrl ? (
        <StudioButton variant="ghost" className="w-full" disabled={downloading} onClick={() => void download(project.finalUrl!, `${baseName(project)}.mp4`)}>
          {downloading ? <Spinner className="h-4 w-4" /> : null}
          {stale ? "下載（舊版）" : "下載影片"}
        </StudioButton>
      ) : null}
      {stale && !busy ? <p className="text-[11px] text-[var(--studio-muted)]">圖層改過了，重新匯出才會套用。</p> : null}
      {project.reelUrl && reelReady ? (
        <button type="button" disabled={downloading} onClick={() => void download(project.reelUrl!, `${baseName(project)}-原片.mp4`)} className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline">
          下載不含圖層的原片
        </button>
      ) : null}
      {error ? <p role="alert" className="text-[11px] text-[#e11d48]">{error}</p> : null}
    </section>
  );
}
