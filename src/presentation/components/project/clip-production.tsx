"use client";

import { useState } from "react";
import { ClipWorkspace } from "@/presentation/components/project/clip-workspace";
import { FrameEditDialog } from "@/presentation/components/project/frame-edit-dialog";
import { VideoDesk } from "@/presentation/components/project/video-desk";
import { clipStatesFor } from "@/service/clip-stage";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import type { PublicVideo } from "@/presentation/serialize";
import type {
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/model/project";

// Selected clip fills the desk: preview, inspector, and the shared filmstrip.
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

  if (!phaseA || states.length === 0) return null;

  const editingRow = editingFrame
    ? phaseA.clips.find((row) => row.clipNumber === editingFrame.clipNumber)
    : undefined;
  const frame = editingFrame
    ? project.frames.find(
        (item) =>
          item.clipNumber === editingFrame.clipNumber &&
          item.position === editingFrame.position,
      )
    : undefined;

  return (
    <>
      <VideoDesk
        key={project.id}
        project={project}
        pending={pending}
        renderPreview={(state) => (
          <ClipWorkspace
            key={`preview-${state.clipNumber}`}
            region="preview"
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
        )}
        renderInspector={(state) => (
          <ClipWorkspace
            key={`inspector-${state.clipNumber}`}
            region="inspector"
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
        )}
      />
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
    </>
  );
}
