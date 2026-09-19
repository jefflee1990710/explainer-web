"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ASPECT_CLASS } from "@/components/project/frame-tile";
import { RefreshIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { ClipState } from "@/lib/clip-stage";
import { STUCK_CLAIM_MS, VIDEO_COST } from "@/lib/production-plan";
import type { AspectRatio, ProjectClip } from "@/types/project";

// Video column of the workspace: empty / generating / ready / failed, with one
// paid button whose label always shows the cost.
export function ClipVideoPanel({
  clip,
  state,
  aspectRatio,
  credits,
  canAct,
  pending,
  onGenerate,
}: {
  clip?: ProjectClip;
  state: ClipState;
  aspectRatio: AspectRatio;
  credits: number;
  // Subscribed and nothing else pending.
  canAct: boolean;
  pending: boolean;
  onGenerate: () => void;
}) {
  const src = clip?.blobUrl || clip?.outputUrl;
  const generating = state.stage === "video_generating";
  const hasVideo = Boolean(src) && clip?.status === "completed";
  const failed = clip?.status === "failed";
  // Old media stays playable through a redo; only a clip that never had a video
  // falls back to the skeleton.
  const showVideo = Boolean(src) && (hasVideo || generating);
  const framesReady = ["frames_ready", "video_ready", "video_failed"].includes(state.stage);

  // Why the button is disabled, if it is.
  const shortCredits = credits < VIDEO_COST;
  const reason = !framesReady
    ? "畫格完成後才能產片"
    : state.stale.frames
      ? "畫格是舊版，請先重畫畫格"
      : shortCredits
        ? "credits 不足"
        : null;
  const disabled = !canAct || generating || pending || reason !== null;
  const label = hasVideo || showVideo ? "重產影片" : failed ? "重試" : "產這段影片";

  // A claim whose background job was lost leaves the clip queued forever. The
  // clock is read from a timer rather than during render, so the server and the
  // first client render agree (0 = not measured yet).
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);
  const claimedAt = clip?.submittedAt ? Date.parse(clip.submittedAt) : NaN;
  const stuck =
    generating &&
    clip?.status === "queued" &&
    !Number.isNaN(claimedAt) &&
    now > 0 &&
    now - claimedAt > STUCK_CLAIM_MS;

  return (
    <div>
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        影片 ·{" "}
        {generating
          ? "產片中"
          : hasVideo
            ? state.stale.video
              ? "舊版"
              : "完成"
            : failed
              ? "失敗"
              : "尚未產片"}
      </p>
      <div
        className={`relative mt-2 overflow-hidden rounded-xl border border-accent-ink/10 bg-paper ${ASPECT_CLASS[aspectRatio]}`}
      >
        {showVideo ? (
          <motion.video
            key={src}
            initial={{ opacity: 0 }}
            animate={{ opacity: generating || state.stale.video ? 0.6 : 1 }}
            src={src}
            controls
            className="absolute inset-0 h-full w-full bg-black"
          />
        ) : generating ? (
          <div className="absolute inset-0 grid place-items-center bg-accent-ink/5" aria-label="產片中">
            <motion.div
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <Spinner className="h-5 w-5 text-accent-ink/50" />
          </div>
        ) : failed ? (
          <div className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-xs font-semibold text-accent">
            產片失敗{clip?.error ? `：${clip.error}` : ""}
            <br />
            <span className="font-normal text-muted">credits 已退回</span>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center border-2 border-dashed border-accent-ink/15 p-3 text-center text-xs font-semibold text-muted">
            ▶ 畫格 OK 後即可產片
          </div>
        )}
        {showVideo && (generating || state.stale.video) ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
            {generating ? "重產中" : "舊版"}
          </span>
        ) : null}
      </div>
      {stuck ? (
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="mt-2 inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 text-[11px] font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Spinner className="h-3.5 w-3.5" /> : <RefreshIcon />}
          看起來卡住了？重試 · {VIDEO_COST}
        </button>
      ) : null}
      <motion.button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        whileTap={{ scale: 0.98 }}
        className={`mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          showVideo
            ? "border border-accent-ink/15 bg-paper hover:border-accent-ink/40"
            : "bg-accent text-white shadow-[3px_3px_0_0_#12141c] hover:-translate-y-0.5 disabled:hover:translate-y-0"
        }`}
      >
        {pending ? <Spinner className="h-4 w-4" /> : showVideo ? <RefreshIcon /> : null}
        {label} · {VIDEO_COST}
      </motion.button>
      {reason && !generating ? (
        <p className="mt-1 text-[11px] text-muted">
          {reason}
          {shortCredits ? (
            <>
              ，
              <Link href="/app/billing" className="font-semibold text-accent underline">
                升級方案
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-muted">會依上面的畫格與文字撰寫 prompt 後送出。</p>
      )}
    </div>
  );
}
