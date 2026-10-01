"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { InFlightCounts } from "@/service/clip-stage";

// Live queue on the production strip: images and videos waiting vs running.
export function ProductionQueue({
  framesQueued,
  framesGenerating,
  videosQueued,
  videosGenerating,
  onOpen,
}: InFlightCounts & { onOpen: () => void }) {
  const { t } = useI18n();
  const frames = framesQueued + framesGenerating;
  const videos = videosQueued + videosGenerating;
  if (frames === 0 && videos === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={t("production.queue.viewTasks")}
      aria-haspopup="dialog"
      className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--studio-ink)] hover:underline"
    >
      <QueueKind
        label={t("production.queue.kindFrames")}
        queued={framesQueued}
        generating={framesGenerating}
        queuedLabel={(n) => t("production.queue.queued", { n })}
        generatingLabel={(n) => t("production.queue.generating", { n })}
      />
      <QueueKind
        label={t("production.queue.kindVideos")}
        queued={videosQueued}
        generating={videosGenerating}
        queuedLabel={(n) => t("production.queue.queued", { n })}
        generatingLabel={(n) => t("production.queue.generating", { n })}
      />
    </button>
  );
}

function QueueKind({
  label,
  queued,
  generating,
  queuedLabel,
  generatingLabel,
}: {
  label: string;
  queued: number;
  generating: number;
  queuedLabel: (n: number) => string;
  generatingLabel: (n: number) => string;
}) {
  if (queued === 0 && generating === 0) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-semibold">{label}</span>
      {queued > 0 ? (
        <span className="tabular-nums text-[var(--studio-muted)]">{queuedLabel(queued)}</span>
      ) : null}
      {generating > 0 ? (
        <span className="tabular-nums text-[var(--studio-teal)]">{generatingLabel(generating)}</span>
      ) : null}
    </span>
  );
}
