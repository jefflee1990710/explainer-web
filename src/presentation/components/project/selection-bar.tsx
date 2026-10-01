"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { planSelected } from "@/service/production-plan";
import type { PublicVideo } from "@/presentation/serialize";

// Batch actions for the clips checked on the filmstrip.
export function SelectionBar({
  project,
  clipNumbers,
  credits,
  pending,
  busy,
  onFrames,
  onVideos,
  onClear,
}: {
  project: PublicVideo;
  clipNumbers: number[];
  credits: number;
  pending: boolean;
  busy: boolean;
  onFrames: (clipNumbers: number[]) => void;
  onVideos: (clipNumbers: number[]) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const frames = planSelected(project, clipNumbers, "frames");
  const videos = planSelected(project, clipNumbers, "videos");
  const skippedVideos = clipNumbers.length - videos.videos.length;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
      <span className="font-semibold">
        {t("production.selection.summary", { n: clipNumbers.length, credits })}
      </span>
      {skippedVideos > 0 ? (
        <span className="text-[var(--studio-muted)]">
          {t("production.selection.videoSkipHint", {
            ready: videos.videos.length,
            skipped: skippedVideos,
          })}
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        {pending ? <Spinner className="h-4 w-4" /> : null}
        <StudioButton
          variant="ghost"
          onClick={() => onFrames(frames.frames)}
          disabled={busy || frames.frames.length === 0}
          className="min-h-9 px-3 text-xs"
        >
          {t("production.selection.framesButton", { cost: frames.cost })}
        </StudioButton>
        <StudioButton
          onClick={() => onVideos(videos.videos)}
          disabled={busy || videos.videos.length === 0}
          className="min-h-9 px-3 text-xs"
        >
          {t("production.selection.videosButton", { cost: videos.cost })}
        </StudioButton>
        <button
          type="button"
          onClick={onClear}
          className="min-h-9 cursor-pointer px-2 font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
        >
          {t("production.action.cancel")}
        </button>
      </div>
    </div>
  );
}
