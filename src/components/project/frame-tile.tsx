"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PencilIcon, RefreshIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { AspectRatio, ClipFrame, FramePosition } from "@/types/project";

const ease = [0.22, 1, 0.36, 1] as const;

export const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
};

export const FRAME_LABEL: Record<FramePosition, string> = {
  start: "起始",
  end: "結尾",
};

// One start/end frame: skeleton while generating, image when done (click to
// annotate + redo), failed state, or an empty "待畫格" placeholder when the
// clip has no frame entry yet.
export function FrameTile({
  frame,
  position,
  aspectRatio,
  canRegenerate,
  pending,
  stale = false,
  onRegenerate,
  onOpen,
}: {
  frame?: ClipFrame;
  position: FramePosition;
  aspectRatio: AspectRatio;
  canRegenerate: boolean;
  pending: boolean;
  // Drawn before the latest text edit; shown dimmed.
  stale?: boolean;
  onRegenerate: () => void;
  onOpen: () => void;
}) {
  const src = frame?.blobUrl || frame?.outputUrl;
  const completed = frame?.status === "completed" && src;
  const failed = frame?.status === "failed";
  const label = FRAME_LABEL[position];

  return (
    <figure className="min-w-0">
      <div
        className={`relative overflow-hidden rounded-xl border border-accent-ink/10 bg-paper ${ASPECT_CLASS[aspectRatio]}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {completed ? (
            <motion.button
              key={src}
              type="button"
              onClick={onOpen}
              aria-label={`放大並標註${label}畫格`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: stale ? 0.6 : 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
              className="group absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${label}畫格`}
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-accent-ink/70 to-transparent px-2 pb-2 pt-6 font-display text-[11px] font-bold text-paper opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <PencilIcon className="h-3.5 w-3.5" />
                點擊標註・重畫
              </span>
            </motion.button>
          ) : failed ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-xs font-semibold text-accent"
            >
              產圖失敗
            </motion.div>
          ) : !frame ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center border-2 border-dashed border-accent-ink/15 text-xs font-semibold text-muted"
            >
              待畫格
            </motion.div>
          ) : (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-hidden bg-accent-ink/5"
              aria-label="產圖中"
            >
              <motion.div
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="absolute inset-0 grid place-items-center text-accent-ink/40">
                {pending ? <Spinner className="h-5 w-5" /> : <PencilIcon />}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-accent-ink/85 px-2 py-0.5 font-display text-[10px] font-bold text-paper">
          {label}
        </span>
        {stale && completed ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
            舊版
          </span>
        ) : null}
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">
          {!frame
            ? "尚未產生"
            : completed
              ? "完成"
              : failed
                ? "失敗"
                : frame.status === "in_progress"
                  ? "生成中"
                  : "排隊中"}
        </span>
        {canRegenerate && (completed || failed) ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-full border border-accent-ink/15 bg-paper px-2.5 text-[11px] font-semibold transition hover:border-accent-ink/40"
          >
            <RefreshIcon />
            重畫 · 1
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
