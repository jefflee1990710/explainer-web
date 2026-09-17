"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Spinner } from "@/components/spinner";
import type { PublicProject } from "@/lib/serialize";
import type { AspectRatio, ClipFrame, FramePosition } from "@/types/project";

const ease = [0.22, 1, 0.36, 1] as const;

const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
};

const FRAME_LABEL: Record<FramePosition, string> = {
  start: "起始",
  end: "結尾",
};

// Timeline review of the generated start/end frames for every clip.
// Shown while frames are generating (skeletons) and once they are ready.
export function FramesTimeline({
  project,
  credits,
  subscribed,
  pending,
  error,
  onApprove,
  onRegenerate,
}: {
  project: PublicProject;
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onApprove: () => void;
  onRegenerate: (clipNumber: number, position: FramePosition) => void;
}) {
  const phaseA = project.phaseA;
  if (!phaseA) return null;

  const frames = project.frames;
  const total = frames.length;
  const done = frames.filter((frame) => frame.status === "completed").length;
  const failedCount = frames.filter((frame) => frame.status === "failed").length;
  const generating = project.status === "frames_generating";
  const ready = project.status === "frames_ready";
  const allDone = ready && failedCount === 0 && done === total;
  const videoCost = phaseA.clipCount;
  const canGenerate = subscribed && credits >= videoCost;
  const busy = pending !== "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
      className="space-y-5"
    >
      <header
        role="status"
        aria-live="polite"
        className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Phase A · 分鏡圖時間軸
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold">
              {generating ? "正在畫分鏡圖" : "檢查每段的起始與結尾"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {generating
                ? "所有畫格同時送出產圖，完成一張就會出現一張。"
                : "確認角色與畫面銜接沒問題後，再核准產片。不滿意的畫格可單張重畫（1 credit）。"}
            </p>
          </div>
          {generating ? (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-ink text-lime">
              <Spinner className="h-5 w-5" />
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-ink/10">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${total ? Math.max(3, (done / total) * 100) : 0}%` }}
              transition={{ duration: 0.6, ease }}
            />
          </div>
          <span className="font-display text-sm font-bold tabular-nums">
            {done}/{total} 張
          </span>
        </div>
      </header>

      {/* Horizontal timeline rail */}
      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <ol className="flex min-w-max snap-x snap-mandatory gap-4">
          {phaseA.clips.map((row, index) => {
            const start = frames.find(
              (frame) => frame.clipNumber === row.clipNumber && frame.position === "start",
            );
            const end = frames.find(
              (frame) => frame.clipNumber === row.clipNumber && frame.position === "end",
            );
            return (
              <motion.li
                key={row.clipNumber}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05, ease }}
                className="w-[320px] shrink-0 snap-start sm:w-[360px]"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-accent-ink px-2.5 py-1 font-display text-xs font-bold text-lime">
                    #{row.clipNumber}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{row.timeRange}</span>
                  <span className="h-px flex-1 bg-accent-ink/15" aria-hidden />
                </div>

                <div className="mt-3 rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-3">
                  <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-2">
                    <FrameTile
                      frame={start}
                      aspectRatio={project.aspectRatio}
                      canRegenerate={ready && !busy}
                      pending={pending === `frame:${row.clipNumber}:start`}
                      onRegenerate={() => onRegenerate(row.clipNumber, "start")}
                    />
                    <ArrowIcon />
                    <FrameTile
                      frame={end}
                      aspectRatio={project.aspectRatio}
                      canRegenerate={ready && !busy}
                      pending={pending === `frame:${row.clipNumber}:end`}
                      onRegenerate={() => onRegenerate(row.clipNumber, "end")}
                    />
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted">
                    {row.explainerScene}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">{row.englishVo}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-sm font-bold">核准分鏡圖並產片</p>
            <p className="mt-1 text-sm">
              將扣 <strong>{videoCost} credits</strong>
              <span className="text-muted">（每段 1 credit · 剩餘 {credits}）</span>
            </p>
            {failedCount > 0 && ready ? (
              <p className="mt-1 text-xs text-accent">
                有 {failedCount} 張失敗，credits 已退回；請重畫後再核准。
              </p>
            ) : null}
            {!canGenerate && ready ? (
              <p className="mt-1 text-xs text-accent">
                {subscribed ? "credits 不足，請先升級方案。" : "尚未訂閱，按下後將前往訂閱頁。"}
              </p>
            ) : null}
          </div>
          <motion.button
            type="button"
            onClick={onApprove}
            disabled={busy || !allDone}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {pending === "approve" ? <Spinner /> : null}
            {pending === "approve"
              ? "送出中…"
              : generating
                ? "等待分鏡圖完成"
                : "核准並產片"}
          </motion.button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
    </motion.section>
  );
}

function FrameTile({
  frame,
  aspectRatio,
  canRegenerate,
  pending,
  onRegenerate,
}: {
  frame?: ClipFrame;
  aspectRatio: AspectRatio;
  canRegenerate: boolean;
  pending: boolean;
  onRegenerate: () => void;
}) {
  const src = frame?.blobUrl || frame?.outputUrl;
  const completed = frame?.status === "completed" && src;
  const failed = frame?.status === "failed";
  const label = frame ? FRAME_LABEL[frame.position] : "";

  return (
    <figure className="min-w-0">
      <div
        className={`relative overflow-hidden rounded-xl border border-accent-ink/10 bg-paper ${ASPECT_CLASS[aspectRatio]}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {completed ? (
            <motion.img
              key={src}
              src={src}
              alt={`${label}畫格`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : failed ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-xs font-semibold text-accent"
            >
              產圖失敗
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
        <span className="absolute left-2 top-2 rounded-full bg-accent-ink/85 px-2 py-0.5 font-display text-[10px] font-bold text-paper">
          {label}
        </span>
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">
          {completed ? "完成" : failed ? "失敗" : frame?.status === "in_progress" ? "生成中" : "排隊中"}
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

function ArrowIcon() {
  return (
    <svg className="h-5 w-5 text-accent-ink/40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m4 20 4-1 10-10-3-3L5 16l-1 4Zm11-14 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
