"use client";

import { useState } from "react";
import { OpenCutClipScroSwapDialog } from "@/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog";
import { OpenCutClipStyleDialog } from "@/presentation/components/app/projects/new/opencut-clip-style-dialog";
import { OpenCutClipTeleportDialog } from "@/presentation/components/app/projects/new/opencut-clip-teleport-dialog";
import { FrameEditDialog } from "@/presentation/components/project/frame-edit-dialog";
import { SceneChatDialog } from "@/presentation/components/project/scene-chat-dialog";
import { resolveClipProject } from "@/service/clip/clip-context";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { mediaSrc } from "@/util/media-src";
import type { FramePosition, FrameRevisionInput } from "@/model/project";
import type { PublicCharacter, PublicStyle, PublicVideo } from "@/presentation/serialize";

/** Host-side SceneChat, FrameEdit, Scro Swap, Teleport, and Clip Style dialogs opened from OpenCut Properties. */
export function OpenCutScroAiShell({
  project,
  styles = [],
  characters = [],
  credits,
  pending,
  subscribed,
  sceneChatClip,
  editingFrame,
  clipSwapClip,
  clipTeleportClip,
  clipStyleClip,
  onCloseSceneChat,
  onCloseFrameEdit,
  onCloseClipSwap,
  onCloseClipTeleport,
  onCloseClipStyle,
  onProject,
  onRegenerateFrame,
}: {
  project: PublicVideo;
  styles?: PublicStyle[];
  characters?: PublicCharacter[];
  credits: number;
  pending: string;
  subscribed: boolean;
  sceneChatClip: number | null;
  editingFrame: { clipNumber: number; position: FramePosition } | null;
  clipSwapClip: number | null;
  clipTeleportClip: number | null;
  clipStyleClip: number | null;
  onCloseSceneChat: () => void;
  onCloseFrameEdit: () => void;
  onCloseClipSwap: () => void;
  onCloseClipTeleport: () => void;
  onCloseClipStyle: () => void;
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

  const swapClipDoc =
    clipSwapClip != null
      ? project.clips.find((item) => item.clipNumber === clipSwapClip)
      : undefined;
  const swapRow =
    clipSwapClip != null
      ? project.phaseA?.clips.find((row) => row.clipNumber === clipSwapClip)
      : undefined;
  const swapVideoUrl = swapClipDoc ? mediaSrc(swapClipDoc) : undefined;

  const teleportClipDoc =
    clipTeleportClip != null
      ? project.clips.find((item) => item.clipNumber === clipTeleportClip)
      : undefined;
  const teleportRow =
    clipTeleportClip != null
      ? project.phaseA?.clips.find((row) => row.clipNumber === clipTeleportClip)
      : undefined;
  const teleportVideoUrl = teleportClipDoc ? mediaSrc(teleportClipDoc) : undefined;

  const styleClipDoc =
    clipStyleClip != null
      ? project.clips.find((item) => item.clipNumber === clipStyleClip)
      : undefined;
  const styleRow =
    clipStyleClip != null
      ? project.phaseA?.clips.find((row) => row.clipNumber === clipStyleClip)
      : undefined;
  const styleClipProj =
    clipStyleClip != null ? resolveClipProject(project, clipStyleClip) : undefined;

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
      {clipSwapClip != null && swapVideoUrl ? (
        <OpenCutClipScroSwapDialog
          key={`swap:${clipSwapClip}`}
          videoId={project.id}
          clipNumber={clipSwapClip}
          durationSeconds={swapRow?.durationSeconds ?? swapClipDoc?.durationSeconds ?? 6}
          videoUrl={swapVideoUrl}
          characters={characters}
          onApplied={onProject}
          onClose={onCloseClipSwap}
        />
      ) : null}
      {clipTeleportClip != null && teleportVideoUrl ? (
        <OpenCutClipTeleportDialog
          key={`teleport:${clipTeleportClip}`}
          videoId={project.id}
          clipNumber={clipTeleportClip}
          durationSeconds={teleportRow?.durationSeconds ?? teleportClipDoc?.durationSeconds ?? 6}
          videoUrl={teleportVideoUrl}
          onApplied={onProject}
          onClose={onCloseClipTeleport}
        />
      ) : null}
      {clipStyleClip != null && styleRow ? (
        <OpenCutClipStyleDialog
          key={`style:${clipStyleClip}`}
          videoId={project.id}
          clipNumber={clipStyleClip}
          durationSeconds={styleRow.durationSeconds ?? styleClipDoc?.durationSeconds ?? 6}
          currentStyleId={styleClipProj?.styleId || project.styleId || "realistic"}
          styles={styles}
          onApplied={onProject}
          onClose={onCloseClipStyle}
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
  const [clipSwapClip, setClipSwapClip] = useState<number | null>(null);
  const [clipTeleportClip, setClipTeleportClip] = useState<number | null>(null);
  const [clipStyleClip, setClipStyleClip] = useState<number | null>(null);
  return {
    sceneChatClip,
    setSceneChatClip,
    editingFrame,
    setEditingFrame,
    clipSwapClip,
    setClipSwapClip,
    clipTeleportClip,
    setClipTeleportClip,
    clipStyleClip,
    setClipStyleClip,
  };
}
