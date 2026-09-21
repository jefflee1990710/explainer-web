"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipWorkspace } from "@/components/project/clip-workspace";
import { FillRemainingDialog } from "@/components/project/fill-remaining-dialog";
import { FrameEditDialog } from "@/components/project/frame-edit-dialog";
import { Spinner } from "@/components/spinner";
import { clipStatesFor, isProjectBusy, productionCounts } from "@/lib/clip-stage";
import { isDualBeatSkill } from "@/lib/director/dual-beat";
import { FRAMES_COST, VIDEO_COST, planRemaining } from "@/lib/production-plan";
import type { PublicVideo } from "@/lib/serialize";
import type {
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/types/project";

const ease = [0.22, 1, 0.36, 1] as const;

// All clips stacked top-to-bottom, plus a fill-remaining footer.
// Shared by the /new form and the project page.
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
  onGoToExport,
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
  onGoToExport?: () => void;
}) {
  const phaseA = project.phaseA;
  const states = clipStatesFor(project);
  const counts = productionCounts(project);
  const plan = planRemaining(project);
  const ready = project.status === "ready";
  const busy = isProjectBusy(project);

  const [editingFrame, setEditingFrame] = useState<{
    clipNumber: number;
    position: FramePosition;
  } | null>(null);
  const [confirmFill, setConfirmFill] = useState(false);

  if (!phaseA || states.length === 0) return null;

  const editingRow = editingFrame
    ? phaseA.clips.find((r) => r.clipNumber === editingFrame.clipNumber)
    : undefined;
  const frame = editingFrame
    ? project.frames.find(
        (f) =>
          f.clipNumber === editingFrame.clipNumber && f.position === editingFrame.position,
      )
    : undefined;
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
              {ready ? "影片完成" : "逐段製作：畫面 prompt → 畫格 → 影片"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              各段由上往下排列。左邊可改起始／結尾畫面後重畫，每段各自扣款。
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
      </header>

      {states.map((state) => (
        <ClipWorkspace
          key={state.clipNumber}
          project={project}
          state={state}
          credits={credits}
          pending={pending}
          error={error}
          onGenerateFrames={() => onGenerateFrames(state.clipNumber)}
          onRegenerateFrame={(position) => onRegenerateFrame(state.clipNumber, position)}
          onOpenFrame={(position) =>
            setEditingFrame({ clipNumber: state.clipNumber, position })
          }
          onUpdateClip={(input, regenerate) =>
            onUpdateClip(state.clipNumber, input, regenerate)
          }
          onGenerateVideo={() => onGenerateVideo(state.clipNumber)}
        />
      ))}

      {/* Footer: fill the gaps, or celebrate. */}
      <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {ready ? (
            <>
              <div>
                <p className="font-display text-sm font-bold">✓ {counts.total} 段影片全部完成</p>
                <p className="mt-1 text-sm text-muted">
                  下一步會把各段接成一支成片，可預覽與下載。任何一段仍可回頭重做。
                </p>
              </div>
              {onGoToExport ? (
                <motion.button
                  type="button"
                  onClick={onGoToExport}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5"
                >
                  下一步：成片
                </motion.button>
              ) : null}
            </>
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
                  <p className="mt-1 text-xs text-accent">
                    尚未訂閱，按下後將前往訂閱頁，或直接
                    <Link href="/app/billing" className="font-semibold underline">
                      升級方案
                    </Link>
                    。
                  </p>
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

      {/* Frame annotate + redo */}
      {editingFrame && frame && editingRow ? (
        <FrameEditDialog
          key={`${editingFrame.clipNumber}:${editingFrame.position}`}
          frame={frame}
          clip={editingRow}
          aspectRatio={project.aspectRatio}
          credits={credits}
          sceneTextEnabled={project.sceneTextEnabled}
          sceneTextLanguage={project.sceneTextLanguage}
          dualBeat={isDualBeatSkill(project.skillSlug)}
          canRegenerate={pending === ""}
          onClose={() => setEditingFrame(null)}
          onRegenerate={(revision) => {
            onRegenerateFrame(editingFrame.clipNumber, editingFrame.position, revision);
            setEditingFrame(null);
          }}
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
