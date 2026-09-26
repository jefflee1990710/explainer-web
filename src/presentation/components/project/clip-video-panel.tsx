"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import { RefreshIcon } from "@/presentation/components/project/production-icons";
import { Spinner } from "@/presentation/components/spinner";
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

  // Nothing to show yet: a hint instead of an empty dashed box.
  if (!showVideo && !generating && !failed) {
    return (
      <p className="text-center text-xs text-[var(--studio-muted)]">
        ▶ 產片後會在這裡播放
      </p>
    );
  }

  return (
    <div
      className={`relative mx-auto w-full max-w-2xl overflow-hidden rounded-md border border-[var(--studio-line)] bg-[var(--studio-canvas)] ${ASPECT_CLASS[aspectRatio]}`}
    >
      {showVideo ? (
        <>
          <motion.video
            key={src}
            initial={{ opacity: 0 }}
            animate={{ opacity: state.stale.video || failed ? 0.6 : 1 }}
            src={src}
            controls
            className="absolute inset-0 h-full w-full bg-black"
          />
          {failed ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-accent/85 px-2 py-1.5 text-center font-display text-[11px] font-bold text-white">
              產片失敗{error ? `：${error}` : ""} · credits 已退回
            </span>
          ) : null}
        </>
      ) : generating ? (
        <div className="absolute inset-0 grid place-items-center bg-accent-ink/5" aria-label="產片中">
          <motion.div
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="flex flex-col items-center gap-2 text-accent-ink/50">
            <Spinner className="h-5 w-5" />
            <span className="font-display text-[11px] font-bold">產片中</span>
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-xs font-semibold text-accent">
          產片失敗{error ? `：${error}` : ""}
          <br />
          <span className="font-normal text-muted">credits 已退回</span>
        </div>
      )}
      {showVideo && state.stale.video ? (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
          舊版
        </span>
      ) : null}
    </div>
  );
}
