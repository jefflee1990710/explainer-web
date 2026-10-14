"use client";

import { useState } from "react";
import { FrameEditDialog } from "@/presentation/components/project/frame-edit-dialog";
import { SceneChatDialog } from "@/presentation/components/project/scene-chat-dialog";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import type { FramePosition, FrameRevisionInput } from "@/model/project";
import type { PublicVideo } from "@/presentation/serialize";

/** Host-side SceneChat + FrameEdit opened from OpenCut Properties. */
export function OpenCutScroAiShell({
  project,
  credits,
  pending,
  subscribed,
  sceneChatClip,
  editingFrame,
  onCloseSceneChat,
  onCloseFrameEdit,
  onProject,
  onRegenerateFrame,
}: {
  project: PublicVideo;
  credits: number;
  pending: string;
  subscribed: boolean;
  sceneChatClip: number | null;
  editingFrame: { clipNumber: number; position: FramePosition } | null;
  onCloseSceneChat: () => void;
  onCloseFrameEdit: () => void;
  onProject: (project: PublicVideo) => void;
  onRegenerateFrame: (
    clipNumber: number,
    position: FramePosition,
    revision?: FrameRevisionInput,
  ) => void;
}) {
  const idle = pending === "";
  const editingRow = editingFrame
    ? project.phaseA?.clips.find((row) => row.clipNumber === editingFrame.clipNumber)
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
      {sceneChatClip != null ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-40 flex w-[min(100%,22rem)] max-w-full p-2 sm:p-3">
          <div className="pointer-events-auto flex min-h-0 w-full flex-col overflow-hidden rounded-md border border-[var(--studio-line)] bg-[var(--studio-panel)] shadow-lg">
            <SceneChatDialog
              key={sceneChatClip}
              project={project}
              clipNumber={sceneChatClip}
              subscribed={subscribed}
              onProject={onProject}
              onClose={onCloseSceneChat}
            />
          </div>
        </div>
      ) : null}
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
          canRegenerate={idle}
          onClose={onCloseFrameEdit}
          onRegenerate={(revision) => {
            onRegenerateFrame(editingFrame.clipNumber, editingFrame.position, revision);
            onCloseFrameEdit();
          }}
        />
      ) : null}
    </>
  );
}

/** Local UI state helpers for the AI shell. */
export function useOpenCutScroAiState() {
  const [sceneChatClip, setSceneChatClip] = useState<number | null>(null);
  const [editingFrame, setEditingFrame] = useState<{
    clipNumber: number;
    position: FramePosition;
  } | null>(null);
  return {
    sceneChatClip,
    setSceneChatClip,
    editingFrame,
    setEditingFrame,
  };
}
