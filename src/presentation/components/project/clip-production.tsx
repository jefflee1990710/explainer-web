"use client";

import { useState } from "react";
import {
  BulkGenerateDialog,
  type BulkMode,
} from "@/presentation/components/project/bulk-generate-dialog";
import { ClipWorkspace } from "@/presentation/components/project/clip-workspace";
import { FrameEditDialog } from "@/presentation/components/project/frame-edit-dialog";
import { ProductionToolbar } from "@/presentation/components/project/production-toolbar";
import { SelectionBar } from "@/presentation/components/project/selection-bar";
import { VideoDesk, type SelectClip } from "@/presentation/components/project/video-desk";
import { clipStatesFor, inFlightCounts, productionCounts, type ClipState } from "@/service/clip-stage";
import { allFramesReady } from "@/service/production-plan";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import type { PublicVideo } from "@/presentation/serialize";
import type {
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/model/project";

// Needs work: no finished video yet, or the video is out of date.
function unfinished(state: ClipState) {
  return state.stage !== "video_ready" || state.stale.frames || state.stale.video;
}

// Selected clip fills the desk: toolbar, preview, inspector, and the shared
// filmstrip with checkboxes for batch runs.
export function ClipProduction({
  project,
  credits,
  pending,
  error,
  onGenerateFrames,
  onRegenerateFrame,
  onUpdateClip,
  onGenerateVideo,
  onCancelVideo,
  onBulkGenerate,
  onGenerateSelected,
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
  onCancelVideo: (clipNumber: number) => void;
  onBulkGenerate: (mode: BulkMode) => Promise<boolean>;
  onGenerateSelected: (clipNumbers: number[], kind: "frames" | "videos") => Promise<boolean>;
}) {
  const phaseA = project.phaseA;
  const states = clipStatesFor(project);
  const [editingFrame, setEditingFrame] = useState<{
    clipNumber: number;
    position: FramePosition;
  } | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<BulkMode | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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

  const counts = productionCounts(project);
  const queue = inFlightCounts(project);
  const firstUnfinished = states.find(unfinished)?.clipNumber;
  const idle = pending === "";

  // Next clip after `clipNumber` that still needs work, wrapping around.
  function nextUnfinishedAfter(clipNumber: number) {
    const index = states.findIndex((state) => state.clipNumber === clipNumber);
    const ordered = [...states.slice(index + 1), ...states.slice(0, index)];
    return ordered.find(unfinished)?.clipNumber;
  }

  function toggleCheck(id: string) {
    setChecked((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  async function runSelected(clipNumbers: number[], kind: "frames" | "videos") {
    if (await onGenerateSelected(clipNumbers, kind)) setChecked([]);
  }

  function workspace(region: "preview" | "inspector", state: ClipState, select: SelectClip) {
    return (
      <ClipWorkspace
        key={`${region}-${state.clipNumber}`}
        region={region}
        project={project}
        state={state}
        credits={credits}
        pending={pending}
        error={error}
        nextUnfinished={nextUnfinishedAfter(state.clipNumber)}
        showDebug={showDebug}
        onGenerateFrames={() => onGenerateFrames(state.clipNumber)}
        onOpenFrame={(position) => setEditingFrame({ clipNumber: state.clipNumber, position })}
        onUpdateClip={(input, regenerate) => onUpdateClip(state.clipNumber, input, regenerate)}
        onGenerateVideo={() => onGenerateVideo(state.clipNumber)}
        onCancelVideo={() => onCancelVideo(state.clipNumber)}
        onSelect={select}
      />
    );
  }

  return (
    <>
      <VideoDesk
        key={project.id}
        project={project}
        pending={pending}
        renderToolbar={(select) => (
          <ProductionToolbar
            videoId={project.id}
            total={counts.total}
            framesDone={counts.framesDone}
            videosDone={counts.videosDone}
            queue={queue}
            firstUnfinished={firstUnfinished}
            showDebug={showDebug}
            busy={!idle}
            framesReady={allFramesReady(project)}
            onJump={select}
            onToggleDebug={() => setShowDebug((value) => !value)}
            onBulk={(mode) => setBulkMode(mode)}
          />
        )}
        renderPreview={(state, select) => workspace("preview", state, select)}
        renderInspector={(state, select) => workspace("inspector", state, select)}
        checkedIds={checked}
        onToggleCheck={toggleCheck}
        timelineBar={
          checked.length ? (
            <SelectionBar
              project={project}
              clipNumbers={checked.map(Number)}
              credits={credits}
              pending={pending === "bulk"}
              busy={!idle}
              onFrames={(clipNumbers) => void runSelected(clipNumbers, "frames")}
              onVideos={(clipNumbers) => void runSelected(clipNumbers, "videos")}
              onClear={() => setChecked([])}
            />
          ) : null
        }
      />
      {bulkMode ? (
        <BulkGenerateDialog
          project={project}
          mode={bulkMode}
          credits={credits}
          pending={
            pending === "bulk" ||
            pending === "all-scenes" ||
            pending === "all-clips" ||
            pending === "remaining"
          }
          onCancel={() => setBulkMode(null)}
          onConfirm={(mode) => {
            setBulkMode(null);
            void onBulkGenerate(mode);
          }}
        />
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
