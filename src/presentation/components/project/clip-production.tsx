"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipTimeline } from "@/presentation/components/project/clip-timeline";
import { ClipWorkspace } from "@/presentation/components/project/clip-workspace";
import { FrameEditDialog } from "@/presentation/components/project/frame-edit-dialog";
import { clipStatesFor, defaultSelectedClip } from "@/service/clip-stage";
import { isDualBeatSkill } from "@/service/director/dual-beat";
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
  pending,
  error,
  onGenerateFrames,
  onRegenerateFrame,
  onUpdateClip,
  onGenerateVideo,
}: {
  project: PublicVideo;
  credits: number;
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
}) {
  const phaseA = project.phaseA;
  const states = clipStatesFor(project);

  const [editingFrame, setEditingFrame] = useState<{
    clipNumber: number;
    position: FramePosition;
  } | null>(null);
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
    </motion.section>
  );
}
