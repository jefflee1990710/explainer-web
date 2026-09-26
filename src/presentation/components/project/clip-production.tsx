"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipTimeline } from "@/presentation/components/project/clip-timeline";
import { ClipWorkspace } from "@/presentation/components/project/clip-workspace";
import { FillRemainingDialog } from "@/presentation/components/project/fill-remaining-dialog";
import { FrameEditDialog } from "@/presentation/components/project/frame-edit-dialog";
import { Spinner } from "@/presentation/components/spinner";
import { clipStatesFor, defaultSelectedClip } from "@/service/clip-stage";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { FRAMES_COST, VIDEO_COST, planRemaining } from "@/service/production-plan";
import type { PublicVideo } from "@/presentation/serialize";
import type {
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/model/project";

const ease = [0.22, 1, 0.36, 1] as const;

// Selected clip on top, clip timeline pinned below — like a video editor.
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
  const plan = planRemaining(project);

  const [editingFrame, setEditingFrame] = useState<{
    clipNumber: number;
    position: FramePosition;
  } | null>(null);
  const [confirmFill, setConfirmFill] = useState(false);
  const [selectedClip, setSelectedClip] = useState(() => defaultSelectedClip(states));

  useEffect(() => {
    setSelectedClip(defaultSelectedClip(clipStatesFor(project)));
  }, [project.id]);

  const selectedState =
    states.find((state) => state.clipNumber === selectedClip) ?? states[0];

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
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
      {selectedState ? (
        <ClipWorkspace
          key={selectedState.clipNumber}
          project={project}
          state={selectedState}
          credits={credits}
          pending={pending}
          error={error}
          onGenerateFrames={() => onGenerateFrames(selectedState.clipNumber)}
          onRegenerateFrame={(position) =>
            onRegenerateFrame(selectedState.clipNumber, position)
          }
          onOpenFrame={(position) =>
            setEditingFrame({ clipNumber: selectedState.clipNumber, position })
          }
          onUpdateClip={(input, regenerate) =>
            onUpdateClip(selectedState.clipNumber, input, regenerate)
          }
          onGenerateVideo={() => onGenerateVideo(selectedState.clipNumber)}
        />
      ) : null}

      {project.status !== "ready" ? (
      <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
        </div>
      </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
      </div>

      <div className="shrink-0 border-t border-accent-ink/10 bg-paper/95 px-4 py-3 sm:px-6">
        <ClipTimeline
          project={project}
          states={states}
          selected={selectedState?.clipNumber ?? selectedClip}
          pending={pending}
          onSelect={setSelectedClip}
        />
      </div>

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
