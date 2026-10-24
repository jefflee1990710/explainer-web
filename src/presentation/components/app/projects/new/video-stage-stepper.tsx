"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideo } from "@/presentation/serialize";
import { computeVideoPipelineProgress } from "@/service/video-progress-steps";

// Compact single-line status indicator for the OpenCut editor toolbar.
export function VideoStageStepper({
  project,
  onOpenTasks,
}: {
  project: PublicVideo;
  onOpenTasks?: () => void;
}) {
  const { t } = useI18n();
  const progress = computeVideoPipelineProgress(project);

  const statusLabel = progress.failed
    ? t("production.toolbar.statusFailed")
    : progress.busy
      ? t("production.toolbar.statusGenerating")
      : progress.step === 5
        ? t("production.toolbar.statusReady")
        : t("production.toolbar.statusPending");

  const badgeClass = progress.failed
    ? "bg-rose-600 text-white"
    : progress.step === 5
      ? "bg-lime text-accent-ink"
      : progress.busy
        ? "bg-accent-ink text-lime"
        : "border border-[var(--studio-line)] bg-[var(--studio-canvas)] text-foreground";

  return (
    <button
      type="button"
      onClick={onOpenTasks}
      title={t("production.queue.viewTasks")}
      className="inline-flex cursor-pointer flex-wrap items-center gap-2 text-left transition hover:opacity-80"
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeClass}`}
      >
        {progress.busy ? (
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--studio-teal)]"
          />
        ) : progress.step === 5 && !progress.failed ? (
          <span aria-hidden className="text-[10px]">
            ✓
          </span>
        ) : null}
        {statusLabel}
      </span>

      <span className="inline-flex items-center gap-2 font-semibold tabular-nums text-foreground">
        <span>
          {t("production.toolbar.progressFrames")} {progress.framesDone}/{progress.framesTotal}
        </span>
        <span aria-hidden className="text-muted">
          ·
        </span>
        <span>
          {t("production.toolbar.progressVideos")} {progress.videosDone}/{progress.videosTotal}
        </span>
      </span>
    </button>
  );
}
