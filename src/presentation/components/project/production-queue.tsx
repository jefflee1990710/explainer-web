"use client";

import type { InFlightCounts } from "@/service/clip-stage";

// Live queue on the production strip: images and videos waiting vs running.
// Clicking it opens this video's task list.
export function ProductionQueue({
  framesQueued,
  framesGenerating,
  videosQueued,
  videosGenerating,
  onOpen,
}: InFlightCounts & { onOpen: () => void }) {
  const frames = framesQueued + framesGenerating;
  const videos = videosQueued + videosGenerating;
  if (frames === 0 && videos === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      title="查看生成任務"
      aria-haspopup="dialog"
      className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--studio-ink)] hover:underline"
    >
      <QueueKind label="畫格" queued={framesQueued} generating={framesGenerating} />
      <QueueKind label="影片" queued={videosQueued} generating={videosGenerating} />
    </button>
  );
}

function QueueKind({
  label,
  queued,
  generating,
}: {
  label: string;
  queued: number;
  generating: number;
}) {
  if (queued === 0 && generating === 0) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-semibold">{label}</span>
      {queued > 0 ? (
        <span className="tabular-nums text-[var(--studio-muted)]">排隊 {queued}</span>
      ) : null}
      {generating > 0 ? (
        <span className="tabular-nums text-[var(--studio-teal)]">產製中 {generating}</span>
      ) : null}
    </span>
  );
}
