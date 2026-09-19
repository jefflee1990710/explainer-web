"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipPlayer } from "@/app/app/projects/[id]/clip-player";
import {
  ClipEditDialog,
  type ClipEditPending,
} from "@/components/project/clip-edit-dialog";
import { ClipTimeline } from "@/components/project/clip-timeline";
import { ClipWorkspace } from "@/components/project/clip-workspace";
import { FillRemainingDialog } from "@/components/project/fill-remaining-dialog";
import { FrameEditDialog } from "@/components/project/frame-edit-dialog";
import { Spinner } from "@/components/spinner";
import { clipStatesFor, isProjectBusy, productionCounts } from "@/lib/clip-stage";
import { FRAMES_COST, VIDEO_COST, planRemaining } from "@/lib/production-plan";
import type { PublicVideo } from "@/lib/serialize";
import type {
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/types/project";

const ease = [0.22, 1, 0.36, 1] as const;

// Per-clip production: timeline of clips on top, one clip's workspace below,
// fill-remaining footer. Shared by the /new form and the project page.
export function ClipProduction({
  project,
  credits,
  subscribed,
  pending,
  error,
  onGenerateFrames,
  onRegenerateFrame,
  onUpdateClip,
  onGenerateVideo,
  onFillRemaining,
}: {
  project: PublicVideo;
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onGenerateFrames: (clipNumber: number) => void;
  onRegenerateFrame: (
    clipNumber: number,
    position: FramePosition,
    revision?: FrameRevisionInput,
  ) => void;
  onUpdateClip: (
    clipNumber: number,
    input: ClipStoryboardInput,
    regenerate: boolean,
  ) => Promise<boolean>;
  onGenerateVideo: (clipNumber: number) => void;
  onFillRemaining: () => Promise<boolean>;
}) {
  const phaseA = project.phaseA;
  const states = clipStatesFor(project);
  const counts = productionCounts(project);
  const plan = planRemaining(project);
  const ready = project.status === "ready";
  const busy = isProjectBusy(project);
  const canAct = subscribed;

  // Default to the first clip that still needs work; #1 when everything is done.
  const [selected, setSelected] = useState<number>(
    () => states.find((s) => s.stage !== "video_ready")?.clipNumber ?? states[0]?.clipNumber ?? 1,
  );
  const [editingFrame, setEditingFrame] = useState<FramePosition | null>(null);
  const [editingText, setEditingText] = useState(false);
  const [confirmFill, setConfirmFill] = useState(false);

  const index = states.findIndex((s) => s.clipNumber === selected);
  const state = states[index] ?? states[0];
  const prev = index > 0 ? states[index - 1].clipNumber : undefined;
  const next = index >= 0 && index < states.length - 1 ? states[index + 1].clipNumber : undefined;

  // ← / → switch clips when no dialog is open and focus is not in a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (editingFrame || editingText || confirmFill) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowLeft" && prev) setSelected(prev);
      if (event.key === "ArrowRight" && next) setSelected(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, editingFrame, editingText, confirmFill]);

  if (!phaseA || !state) return null;

  const row = phaseA.clips.find((r) => r.clipNumber === state.clipNumber);
  const frame = editingFrame
    ? project.frames.find(
        (f) => f.clipNumber === state.clipNumber && f.position === editingFrame,
      )
    : undefined;
  const clipEditPending: ClipEditPending =
    pending === `clip:${state.clipNumber}`
      ? "save"
      : pending === `clip:${state.clipNumber}:regen`
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
      <header className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Phase B · 製作
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold">
              {ready ? "影片完成" : "逐段製作：畫格 → 影片"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              點時間軸切換段落。每段各自扣款、各自重做，隨時可以回頭。
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-display font-bold tabular-nums">
              畫格 {counts.framesDone}/{counts.total} · 影片 {counts.videosDone}/{counts.total}
            </p>
            <p className="text-muted">剩餘 credits：{credits}</p>
            {busy ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                <Spinner className="h-3 w-3" /> 生成中，完成會自動更新
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5">
          <ClipTimeline
            project={project}
            states={states}
            selected={state.clipNumber}
            onSelect={setSelected}
          />
        </div>
      </header>

      <ClipWorkspace
        project={project}
        state={state}
        credits={credits}
        canAct={canAct}
        pending={pending}
        onPrev={prev ? () => setSelected(prev) : undefined}
        onNext={next ? () => setSelected(next) : undefined}
        onGenerateFrames={() => onGenerateFrames(state.clipNumber)}
        onRegenerateFrame={(position) => onRegenerateFrame(state.clipNumber, position)}
        onOpenFrame={setEditingFrame}
        onEditText={() => setEditingText(true)}
        onGenerateVideo={() => onGenerateVideo(state.clipNumber)}
      />

      {/* Footer: fill the gaps, or celebrate. */}
      <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {ready ? (
            <div>
              <p className="font-display text-sm font-bold">✓ {counts.total} 段影片全部完成</p>
              <p className="mt-1 text-sm text-muted">
                下方可連續預覽；任何一段仍可回頭重做，重做時專案會回到「製作中」。
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="font-display text-sm font-bold">
                  還有 {states.filter((s) => s.stage !== "video_ready").length} 段沒完成
                </p>
                <p className="mt-1 text-sm text-muted">
                  {plan.cost > 0
                    ? `${plan.frames.length} 段要畫格（${plan.frames.length * FRAMES_COST}）+ ${plan.videos.length} 段要影片（${plan.videos.length * VIDEO_COST}）＝ ${plan.cost} credits；生成中與需重做的段落不會重送。`
                    : "目前沒有可一次補齊的段落（生成中或需重做的段落要在工作區處理）。"}
                </p>
                {!subscribed ? (
                  <p className="mt-1 text-xs text-accent">尚未訂閱，按下後將前往訂閱頁。</p>
                ) : null}
              </div>
              <motion.button
                type="button"
                onClick={() => setConfirmFill(true)}
                disabled={pending !== "" || plan.cost === 0}
                whileTap={{ scale: 0.98 }}
                className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending === "remaining" ? <Spinner /> : null}
                補齊剩餘 · {plan.cost}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}

      {ready ? <ClipPlayer project={project} /> : null}

      {/* Frame annotate + redo */}
      {editingFrame && frame && row ? (
        <FrameEditDialog
          key={`${state.clipNumber}:${editingFrame}`}
          frame={frame}
          clip={row}
          aspectRatio={project.aspectRatio}
          credits={credits}
          canRegenerate={canAct && pending === ""}
          onClose={() => setEditingFrame(null)}
          onRegenerate={(revision) => {
            onRegenerateFrame(state.clipNumber, editingFrame, revision);
            setEditingFrame(null);
          }}
        />
      ) : null}

      {/* Storyboard text editor: save free, or save + redraw both frames */}
      {editingText && row ? (
        <ClipEditDialog
          key={row.clipNumber}
          clip={row}
          language={project.language}
          credits={credits}
          canRegenerate={canAct && pending === ""}
          pending={clipEditPending}
          error={error}
          onClose={() => setEditingText(false)}
          onSave={(input, regenerate) => onUpdateClip(row.clipNumber, input, regenerate)}
        />
      ) : null}

      {confirmFill ? (
        <FillRemainingDialog
          plan={plan}
          states={states}
          credits={credits}
          pending={pending === "remaining"}
          onCancel={() => setConfirmFill(false)}
          onConfirm={() => {
            void onFillRemaining().then(() => setConfirmFill(false));
          }}
        />
      ) : null}
    </motion.section>
  );
}
