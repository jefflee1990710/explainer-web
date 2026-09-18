"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipEditDialog,
  type ClipEditPending,
} from "@/components/project/clip-edit-dialog";
import { FrameEditDialog } from "@/components/project/frame-edit-dialog";
import { Spinner } from "@/components/spinner";
import type { PublicProject } from "@/lib/serialize";
import type {
  AspectRatio,
  ClipFrame,
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/types/project";

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
  onUpdateClip,
}: {
  project: PublicProject;
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onApprove: () => void;
  // Optional revision comes from the edit dialog (sketch + remark).
  onRegenerate: (
    clipNumber: number,
    position: FramePosition,
    revision?: FrameRevisionInput,
  ) => void;
  // Rewrite one clip's storyboard text; `regenerate` also redraws its two
  // frames (2 credits). Resolves true when the update landed.
  onUpdateClip: (
    clipNumber: number,
    input: ClipStoryboardInput,
    regenerate: boolean,
  ) => Promise<boolean>;
}) {
  // Which frame the edit dialog is open for; null when closed.
  const [editing, setEditing] = useState<{
    clipNumber: number;
    position: FramePosition;
  } | null>(null);
  // Which clip's storyboard text is being edited; null when closed.
  const [editingClipNumber, setEditingClipNumber] = useState<number | null>(null);

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

  // Resolve the frame + storyboard row behind the open dialog (if any).
  const editingFrame = editing
    ? frames.find(
        (frame) =>
          frame.clipNumber === editing.clipNumber && frame.position === editing.position,
      )
    : undefined;
  const editingClip = editing
    ? phaseA.clips.find((row) => row.clipNumber === editing.clipNumber)
    : undefined;
  // Storyboard row behind the open clip-edit dialog (if any).
  const editingClipRow =
    editingClipNumber !== null
      ? phaseA.clips.find((row) => row.clipNumber === editingClipNumber)
      : undefined;
  const clipEditPending: ClipEditPending =
    editingClipNumber === null
      ? ""
      : pending === `clip:${editingClipNumber}`
        ? "save"
        : pending === `clip:${editingClipNumber}:regen`
          ? "regenerate"
          : "";

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
                : "確認角色與畫面銜接沒問題後，再核准產片。點擊畫格可放大、手繪標註並寫備註後重畫（1 credit）；也可直接編輯這段的分鏡內容，再依新內容重畫。"}
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
                      onOpen={() => setEditing({ clipNumber: row.clipNumber, position: "start" })}
                    />
                    <ArrowIcon />
                    <FrameTile
                      frame={end}
                      aspectRatio={project.aspectRatio}
                      canRegenerate={ready && !busy}
                      pending={pending === `frame:${row.clipNumber}:end`}
                      onRegenerate={() => onRegenerate(row.clipNumber, "end")}
                      onOpen={() => setEditing({ clipNumber: row.clipNumber, position: "end" })}
                    />
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted">
                    {row.explainerScene}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">{row.englishVo}</p>
                  {/* Rewrite the storyboard text for this clip (and optionally redraw it) */}
                  {ready ? (
                    <button
                      type="button"
                      onClick={() => setEditingClipNumber(row.clipNumber)}
                      disabled={busy}
                      className="mt-3 inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pending === `clip:${row.clipNumber}` ||
                      pending === `clip:${row.clipNumber}:regen` ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <EditIcon />
                      )}
                      編輯分鏡內容
                    </button>
                  ) : null}
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

      {/* Click-to-edit dialog: sketch + remark → paid redo */}
      {editing && editingFrame && editingClip ? (
        <FrameEditDialog
          key={`${editing.clipNumber}:${editing.position}`}
          frame={editingFrame}
          clip={editingClip}
          aspectRatio={project.aspectRatio}
          credits={credits}
          canRegenerate={ready && !busy}
          onClose={() => setEditing(null)}
          onRegenerate={(revision) =>
            onRegenerate(editing.clipNumber, editing.position, revision)
          }
        />
      ) : null}

      {/* Clip text editor: save for free, or save + redraw both frames */}
      {editingClipRow ? (
        <ClipEditDialog
          key={editingClipRow.clipNumber}
          clip={editingClipRow}
          language={project.language}
          credits={credits}
          canRegenerate={ready && !busy}
          pending={clipEditPending}
          error={error}
          onClose={() => setEditingClipNumber(null)}
          onSave={(input, regenerate) =>
            onUpdateClip(editingClipRow.clipNumber, input, regenerate)
          }
        />
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
  onOpen,
}: {
  frame?: ClipFrame;
  aspectRatio: AspectRatio;
  canRegenerate: boolean;
  pending: boolean;
  onRegenerate: () => void;
  // Opens the edit dialog for a completed frame.
  onOpen: () => void;
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
            <motion.button
              key={src}
              type="button"
              onClick={onOpen}
              aria-label={`放大並標註${label}畫格`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
              className="group absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${label}畫格`}
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              {/* Hover hint so the tile reads as editable */}
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

function PencilIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m4 20 4-1 10-10-3-3L5 16l-1 4Zm11-14 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4Zm10-14 4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
