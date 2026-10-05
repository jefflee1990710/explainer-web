"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { RefreshIcon } from "@/presentation/components/project/production-icons";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { canRedrawFrames, clipNextAction, clipNextActionText } from "@/service/clip-next-action";
import { FRAMES_COST, needsVideoUpgrade } from "@/service/production-plan";
import type { ClipState } from "@/service/clip-stage";

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
  nextUnfinished?: number;
  credits: number;
  hasFrames: boolean;
  idle: boolean;
  pending: boolean;
  onGenerateFrames: () => void;
  onGenerateVideo: () => void;
  onSelect: (clipNumber: number) => void;
}) {
  const { t } = useI18n();
  const action = clipNextAction(state, nextUnfinished);
  const text = clipNextActionText(t, action);
  const videoUpgrade = action.kind === "video" && needsVideoUpgrade(credits, action.cost);
  const short = action.cost > 0 && credits < action.cost && !videoUpgrade;
  const busy = action.kind === "busy" || pending;
  const disabled = busy || !idle || action.kind === "done";

  function onClick() {
    if (action.kind === "frames") onGenerateFrames();
    else if (action.kind === "video") onGenerateVideo();
    else if (action.kind === "next" && nextUnfinished !== undefined) onSelect(nextUnfinished);
  }

  const showRedraw = canRedrawFrames(state, hasFrames) && action.kind !== "frames";

  return (
    <div className="flex flex-col gap-2">
      {showRedraw ? (
        <StudioButton
          variant="ghost"
          onClick={onGenerateFrames}
          disabled={!idle}
          className="w-full justify-center gap-2"
        >
          <RefreshIcon className="h-3.5 w-3.5" />
          {t("production.action.rerenderFrame", { cost: state.frameCost ?? FRAMES_COST })}
        </StudioButton>
      ) : null}
      <StudioButton
        onClick={onClick}
        disabled={disabled}
        variant={action.kind === "next" || action.kind === "done" ? "ghost" : "primary"}
        className="w-full justify-center gap-2"
      >
        {busy ? <Spinner className="h-4 w-4" /> : null}
        {text.label}
        {action.cost > 0 ? ` · ${action.cost}` : ""}
      </StudioButton>
      <p className="text-[11px] leading-4 text-[var(--studio-muted)]">
        {short ? t("production.action.insufficientClickToUpgrade") : text.hint}
      </p>
    </div>
  );
}
