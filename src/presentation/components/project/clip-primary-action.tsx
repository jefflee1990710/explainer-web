"use client";

import Link from "next/link";
import { RefreshIcon } from "@/presentation/components/project/production-icons";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { clipNextAction } from "@/service/clip-next-action";
import { FRAMES_COST } from "@/service/production-plan";
import type { ClipState } from "@/service/clip-stage";

// The clip's single "what to do next" button, plus a quiet redraw link.
export function ClipPrimaryAction({
  state,
  nextUnfinished,
  credits,
  hasFrames,
  idle,
  pending,
  onGenerateFrames,
  onGenerateVideo,
  onSelect,
}: {
  state: ClipState;
  // Clip number "下一段" jumps to; undefined when every other clip is done.
  nextUnfinished?: number;
  credits: number;
  hasFrames: boolean;
  // Nothing else is running.
  idle: boolean;
  // This clip's own action is being sent.
  pending: boolean;
  onGenerateFrames: () => void;
  onGenerateVideo: () => void;
  onSelect: (clipNumber: number) => void;
}) {
  const action = clipNextAction(state, nextUnfinished);
  const short = action.cost > 0 && credits < action.cost;
  const busy = action.kind === "busy" || pending;
  const disabled = busy || !idle || short || action.kind === "done";

  function onClick() {
    if (action.kind === "frames") onGenerateFrames();
    else if (action.kind === "video") onGenerateVideo();
    else if (action.kind === "next" && nextUnfinished !== undefined) onSelect(nextUnfinished);
  }

  // Redraw stays available once frames exist, unless it is already the main action.
  const showRedraw = hasFrames && action.kind !== "frames" && action.kind !== "busy";

  return (
    <div className="flex flex-col gap-2">
      <StudioButton
        onClick={onClick}
        disabled={disabled}
        variant={action.kind === "next" || action.kind === "done" ? "ghost" : "primary"}
        className="w-full justify-center gap-2"
      >
        {busy ? <Spinner className="h-4 w-4" /> : null}
        {action.label}
        {action.cost > 0 ? ` · ${action.cost}` : ""}
      </StudioButton>
      <p className="text-[11px] leading-4 text-[var(--studio-muted)]">
        {short ? (
          <>
            credits 不足，
            <Link href="/app/billing" className="font-semibold text-accent underline">
              升級方案
            </Link>
          </>
        ) : (
          action.hint
        )}
      </p>
      {showRedraw ? (
        <button
          type="button"
          onClick={onGenerateFrames}
          disabled={!idle || credits < FRAMES_COST}
          className="inline-flex cursor-pointer items-center gap-1 self-start text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:text-[var(--studio-ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon />
          重畫兩張畫格 · {FRAMES_COST}
        </button>
      ) : null}
    </div>
  );
}
