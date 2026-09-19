"use client";

import { motion } from "framer-motion";
import { ASPECT_CLASS } from "@/components/project/frame-tile";
import { RefreshIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { ClipState } from "@/lib/clip-stage";
import { VIDEO_COST } from "@/lib/production-plan";
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
  const hasVideo = clip?.status === "completed" && src;
  const failed = clip?.status === "failed";
  const framesReady = ["frames_ready", "video_ready", "video_failed"].includes(state.stage);

  // Why the button is disabled, if it is.
  const reason = !framesReady
    ? "畫格完成後才能產片"
    : state.stale.frames
      ? "畫格是舊版，請先重畫畫格"
      : credits < VIDEO_COST
        ? "credits 不足"
        : null;
  const disabled = !canAct || generating || pending || reason !== null;
  const label = hasVideo ? "重產影片" : failed ? "重試" : "產這段影片";

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
        {hasVideo ? (
          <motion.video
            key={src}
            initial={{ opacity: 0 }}
            animate={{ opacity: state.stale.video ? 0.6 : 1 }}
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
        {hasVideo && state.stale.video ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
            舊版
          </span>
        ) : null}
      </div>
      <motion.button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        whileTap={{ scale: 0.98 }}
        className={`mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          hasVideo
            ? "border border-accent-ink/15 bg-paper hover:border-accent-ink/40"
            : "bg-accent text-white shadow-[3px_3px_0_0_#12141c] hover:-translate-y-0.5 disabled:hover:translate-y-0"
        }`}
      >
        {pending ? <Spinner className="h-4 w-4" /> : hasVideo ? <RefreshIcon /> : null}
        {label} · {VIDEO_COST}
      </motion.button>
      {reason && !generating ? (
        <p className="mt-1 text-[11px] text-muted">{reason}</p>
      ) : (
        <p className="mt-1 text-[11px] text-muted">會依上面的畫格與文字撰寫 prompt 後送出。</p>
      )}
    </div>
  );
}
