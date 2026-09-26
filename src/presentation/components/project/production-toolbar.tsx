"use client";

import { ProductionQueue } from "@/presentation/components/project/production-queue";
import { StudioButton } from "@/presentation/studio/studio-button";
import type { InFlightCounts } from "@/service/clip-stage";

// Strip above the desk: overall progress, live queue, debug toggle, and "全部產生".
export function ProductionToolbar({
  total,
  framesDone,
  videosDone,
  queue,
  firstUnfinished,
  showDebug,
  busy,
  onJump,
  onToggleDebug,
  onBulk,
}: {
  total: number;
  framesDone: number;
  videosDone: number;
  queue: InFlightCounts;
  // First clip that still needs work; undefined when everything is done.
  firstUnfinished?: number;
  showDebug: boolean;
  // Another action is running.
  busy: boolean;
  onJump: (clipNumber: number) => void;
  onToggleDebug: () => void;
  onBulk: () => void;
}) {
  const videosLeft = total - videosDone;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
      <button
        type="button"
        onClick={() => firstUnfinished !== undefined && onJump(firstUnfinished)}
        disabled={firstUnfinished === undefined}
        title={firstUnfinished !== undefined ? `跳到 Clip${firstUnfinished}` : undefined}
        className="flex cursor-pointer items-center gap-3 text-xs disabled:cursor-default"
      >
        <Progress label="畫格" done={framesDone} total={total} />
        <Progress label="影片" done={videosDone} total={total} />
        <span className="text-[var(--studio-muted)]">
          {videosLeft > 0 ? `還有 ${videosLeft} 段未產片 →` : "全部完成，可以成片"}
        </span>
      </button>
      <ProductionQueue {...queue} />
      <div className="ml-auto flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--studio-muted)]">
          <input
            type="checkbox"
            checked={showDebug}
            onChange={onToggleDebug}
            className="h-3.5 w-3.5 accent-[var(--studio-teal)]"
          />
          技術資訊
        </label>
        <StudioButton onClick={onBulk} disabled={busy} className="min-h-9 px-3 text-xs">
          全部產生
        </StudioButton>
      </div>
    </div>
  );
}

// "畫格 3/5" with a thin bar.
function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-semibold">{label}</span>
      <span className="tabular-nums">
        {done}/{total}
      </span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--studio-line)]" aria-hidden>
        <span className="block h-full bg-[var(--studio-teal)]" style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
}
