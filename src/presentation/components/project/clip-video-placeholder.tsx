"use client";

import { PlayIcon } from "@/presentation/components/project/production-icons";
import { Spinner } from "@/presentation/components/spinner";
import { VIDEO_COST } from "@/service/production-plan";

// Empty 9:16 slot before a clip has video. The whole face is the generate
// button so "產片後在此播放" is not just a hint.
export function ClipVideoPlaceholder({
  pending,
  disabled = false,
  onGenerate,
}: {
  pending: boolean;
  disabled?: boolean;
  onGenerate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={pending || disabled}
      className="absolute inset-0 grid cursor-pointer place-items-center border-2 border-dashed border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)] transition hover:border-[var(--studio-ink)]/25 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex flex-col items-center gap-3 px-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--studio-ink)] text-white shadow-md">
          {pending ? <Spinner className="h-6 w-6" /> : <PlayIcon className="ml-0.5 h-7 w-7" />}
        </span>
        <span className="font-display text-[13px] font-bold">▶ 產片後在此播放</span>
        <span className="text-[11px] text-[var(--studio-muted)]">點擊產這段影片 · {VIDEO_COST}</span>
      </span>
    </button>
  );
}
