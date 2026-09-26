"use client";

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
  // This bar's own action is being sent.
  pending: boolean;
  // Any action is running.
  busy: boolean;
  onFrames: (clipNumbers: number[]) => void;
  onVideos: (clipNumbers: number[]) => void;
  onClear: () => void;
}) {
  const frames = planSelected(project, clipNumbers, "frames");
  const videos = planSelected(project, clipNumbers, "videos");
  const skippedVideos = clipNumbers.length - videos.videos.length;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
      <span className="font-semibold">已選 {clipNumbers.length} 段</span>
      {skippedVideos > 0 ? (
        <span className="text-[var(--studio-muted)]">
          {videos.videos.length} 段可產片，{skippedVideos} 段缺畫格或畫格是舊版
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        {pending ? <Spinner className="h-4 w-4" /> : null}
        <StudioButton
          variant="ghost"
          onClick={() => onFrames(frames.frames)}
          disabled={busy || frames.frames.length === 0 || credits < frames.cost}
          className="min-h-9 px-3 text-xs"
        >
          畫格 · {frames.cost}
        </StudioButton>
        <StudioButton
          onClick={() => onVideos(videos.videos)}
          disabled={busy || videos.videos.length === 0 || credits < videos.cost}
          className="min-h-9 px-3 text-xs"
        >
          產片 · {videos.cost}
        </StudioButton>
        <button
          type="button"
          onClick={onClear}
          className="min-h-9 cursor-pointer px-2 font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
        >
          取消
        </button>
      </div>
    </div>
  );
}
