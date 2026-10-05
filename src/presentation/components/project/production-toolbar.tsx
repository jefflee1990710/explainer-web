"use client";

import { useState } from "react";
import { TaskListDialog } from "@/presentation/components/app/tasks/task-list-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  AllFramesIcon,
  AllFramesVideoIcon,
  FinishMissingIcon,
} from "@/presentation/components/project/production-bulk-action-icons";
import { ProductionQueue } from "@/presentation/components/project/production-queue";
import type { BulkMode } from "@/presentation/components/project/bulk-generate-dialog";
import { StudioButton } from "@/presentation/studio/studio-button";
import type { InFlightCounts } from "@/service/clip-stage";

// Strip above the desk: overall progress, live queue (opens this video's task
// list), debug toggle, and bulk generate.
export function ProductionToolbar({
  videoId,
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
  videoId: string;
  total: number;
  framesDone: number;
  videosDone: number;
  queue: InFlightCounts;
  firstUnfinished?: number;
  showDebug: boolean;
  busy: boolean;
  onJump: (clipNumber: number) => void;
  onToggleDebug: () => void;
  onBulk: (mode: BulkMode) => void;
}) {
  const { t } = useI18n();
  const videosLeft = total - videosDone;
  const [tasksOpen, setTasksOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
      <button
        type="button"
        onClick={() => firstUnfinished !== undefined && onJump(firstUnfinished)}
        disabled={firstUnfinished === undefined}
        title={
          firstUnfinished !== undefined
            ? t("production.toolbar.jumpToClip", { n: firstUnfinished })
            : undefined
        }
        className="flex cursor-pointer items-center gap-3 text-xs disabled:cursor-default"
      >
        <Progress label={t("production.toolbar.progressFrames")} done={framesDone} total={total} />
        <Progress label={t("production.toolbar.progressVideos")} done={videosDone} total={total} />
        <span className="text-[var(--studio-muted)]">
          {videosLeft > 0
            ? t("production.toolbar.videosRemaining", { n: videosLeft })
            : t("production.toolbar.allDone")}
        </span>
      </button>
      <ProductionQueue {...queue} onOpen={() => setTasksOpen(true)} />
      {tasksOpen ? <TaskListDialog videoId={videoId} onClose={() => setTasksOpen(false)} /> : null}
      <div className="ml-auto flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--studio-muted)]">
          <input
            type="checkbox"
            checked={showDebug}
            onChange={onToggleDebug}
            className="h-3.5 w-3.5 accent-[var(--studio-teal)]"
          />
          {t("production.toolbar.debug")}
        </label>
        <StudioButton
          variant="ghost"
          onClick={() => onBulk("remaining")}
          disabled={busy}
          className="min-h-9 px-3 text-xs"
        >
          <FinishMissingIcon />
          {t("production.toolbar.bulkRemaining")}
        </StudioButton>
        <StudioButton
          variant="ghost"
          onClick={() => onBulk("scenes")}
          disabled={busy}
          className="min-h-9 px-3 text-xs"
        >
          <AllFramesIcon />
          {t("production.toolbar.bulkAllFrames")}
        </StudioButton>
        <StudioButton
          onClick={() => onBulk("clips")}
          disabled={busy}
          className="min-h-9 px-3 text-xs"
        >
          <AllFramesVideoIcon />
          {t("production.toolbar.bulkAllFramesVideo")}
        </StudioButton>
      </div>
    </div>
  );
}

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
