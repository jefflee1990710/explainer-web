"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipVideoPlaceholder } from "@/presentation/components/project/clip-video-placeholder";
import { ClipVideoPlayer } from "@/presentation/components/project/clip-video-player";
import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import { RefreshIcon } from "@/presentation/components/project/production-icons";
import { Spinner } from "@/presentation/components/spinner";
import { clipNextAction } from "@/service/clip-next-action";
import type { ClipState } from "@/service/clip-stage";
import { userFacingJobError } from "@/service/higgsfield/job-status";
import { mediaSrc } from "@/util/media-src";
import { STUCK_CLAIM_MS, VIDEO_COST } from "@/service/production-plan";
import type { AspectRatio, ProjectClip } from "@/model/project";

// Video pieces of the workspace. `player` shows generating / ready / failed
// (or a one-line hint before any video); `stuck` offers a retry when a claimed
// job never started. The paid buttons live in ClipPrimaryAction.
export function ClipVideoPanel({
  clip,
  state,
  aspectRatio,
  pending,
  onGenerate,
  part,
}: {
  clip?: ProjectClip;
  state: ClipState;
  aspectRatio: AspectRatio;
  pending: boolean;
  onGenerate: () => void;
  part: "player" | "stuck";
}) {
  const src = mediaSrc(clip);
  const generating = state.stage === "video_generating" || pending;
  const failed = clip?.status === "failed";
  const error = failed ? userFacingJobError("failed", clip?.error) : undefined;
  // Hide the previous file the moment a redo is clicked or queued.
  const showVideo = Boolean(src) && !generating;

  // A claim whose background job was lost leaves the clip queued forever. The
  // clock is read from a timer rather than during render, so the server and the
  // first client render agree (0 = not measured yet).
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (part !== "stuck") return;
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, [part]);
  const claimedAt = clip?.submittedAt ? Date.parse(clip.submittedAt) : NaN;
  const stuck =
    generating &&
    clip?.status === "queued" &&
    !Number.isNaN(claimedAt) &&
    now > 0 &&
    now - claimedAt > STUCK_CLAIM_MS;

  if (part === "stuck") {
    return stuck ? (
      <button
        type="button"
        onClick={onGenerate}
        disabled={pending}
        className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 self-start rounded-md border border-accent/40 bg-accent/10 px-3 text-[11px] font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Spinner className="h-3.5 w-3.5" /> : <RefreshIcon />}
        看起來卡住了？重試 · {VIDEO_COST}
      </button>
    ) : null;
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-md border border-[var(--studio-line)] bg-[var(--studio-canvas)] ${ASPECT_CLASS[aspectRatio]}`}
    >
      {showVideo ? (
        <>
          <ClipVideoPlayer src={src} dimmed={state.stale.video || failed} />
          {failed ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-accent/85 px-2 py-1.5 text-center font-display text-[11px] font-bold text-white">
              產片失敗{error ? `：${error}` : ""} · credits 已退回
            </span>
          ) : null}
        </>
      ) : generating ? (
        <GeneratingVideo state={state} />
      ) : failed ? (
        <div className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-[11px] font-semibold text-accent">
          產片失敗{error ? `：${error}` : ""}
          <br />
          <span className="font-normal text-muted">credits 已退回</span>
        </div>
      ) : (
        <ClipVideoPlaceholder
          pending={pending}
          disabled={clipNextAction(state).kind !== "video"}
          onGenerate={onGenerate}
        />
      )}
      {showVideo && state.stale.video ? (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
          舊版
        </span>
      ) : null}
    </div>
  );
}

function GeneratingVideo({ state }: { state: ClipState }) {
  const action = clipNextAction(state);
  return (
    <div className="absolute inset-0 grid place-items-center bg-accent-ink/5" aria-label={action.label}>
      <motion.div
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="flex flex-col items-center gap-2 px-4 text-center text-accent-ink/50">
        <Spinner className="h-5 w-5" />
        <span className="font-display text-[11px] font-bold">{action.label}</span>
        <span className="text-[11px]">{action.hint}</span>
      </span>
    </div>
  );
}
