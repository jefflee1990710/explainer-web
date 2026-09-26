"use client";

import { ClipPrimaryAction } from "@/presentation/components/project/clip-primary-action";
import { ClipPreviewStage } from "@/presentation/components/project/clip-preview-stage";
import { ClipVideoPanel } from "@/presentation/components/project/clip-video-panel";
import {
  ClipScenePrompts,
  type ClipScenePending,
} from "@/presentation/components/project/clip-scene-prompts";
import { FramePromptPanel } from "@/presentation/components/project/frame-prompt-panel";
import type { ClipState } from "@/service/clip-stage";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import type { PublicVideo } from "@/presentation/serialize";
import type { ClipStoryboardInput, FramePosition } from "@/model/project";

// One clip split across the preview pane and the inspector.
export function ClipWorkspace({
  project,
  state,
  credits,
  pending,
  error,
  nextUnfinished,
  showDebug,
  onGenerateFrames,
  onOpenFrame,
  onUpdateClip,
  onGenerateVideo,
  onSelect,
  region,
}: {
  project: PublicVideo;
  state: ClipState;
  credits: number;
  // Pending key of the running action ("" when idle).
  pending: string;
  error: string;
  // Clip the "下一段" button jumps to.
  nextUnfinished?: number;
  // Show the frame prompt debug panel.
  showDebug: boolean;
  onGenerateFrames: () => void;
  onOpenFrame: (position: FramePosition) => void;
  onUpdateClip: (input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>;
  onGenerateVideo: () => void;
  onSelect: (clipNumber: number) => void;
  // Preview is the right pane; inspector is the left form.
  region: "preview" | "inspector";
}) {
  const n = state.clipNumber;
  const row = project.phaseA?.clips.find((item) => item.clipNumber === n);
  if (!row) return null;
  const start = project.frames.find((f) => f.clipNumber === n && f.position === "start");
  const end = project.frames.find((f) => f.clipNumber === n && f.position === "end");
  const clip = project.clips.find((c) => c.clipNumber === n);
  const scenePending: ClipScenePending =
    pending === `clip:${n}` ? "save" : pending === `clip:${n}:regen` ? "regenerate" : "";

  const framesPending = pending === `frames:${n}` || pending === `clip:${n}:regen`;
  const ownPending = framesPending || pending === `video:${n}` || pending.startsWith(`frame:${n}:`);
  const idle = pending === "";

  if (region === "preview") {
    return (
      <ClipPreviewStage
        start={start}
        end={end}
        clip={clip}
        state={state}
        aspectRatio={project.aspectRatio}
        framesPending={framesPending}
        startPending={pending === `frame:${n}:start`}
        endPending={pending === `frame:${n}:end`}
        videoPending={pending === `video:${n}`}
        onOpenFrame={onOpenFrame}
        onGenerateVideo={onGenerateVideo}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-sm font-semibold">Clip{n}.mp4</p>
        <p className="mt-1 text-xs tabular-nums text-muted">
          {row.timeRange} · {row.durationSeconds} 秒
        </p>
      </header>

      <ClipPrimaryAction
        state={state}
        nextUnfinished={nextUnfinished}
        credits={credits}
        hasFrames={Boolean(start || end)}
        idle={idle}
        pending={ownPending}
        onGenerateFrames={onGenerateFrames}
        onGenerateVideo={onGenerateVideo}
        onSelect={onSelect}
      />
      <ClipVideoPanel
        clip={clip}
        state={state}
        aspectRatio={project.aspectRatio}
        pending={pending === `video:${n}`}
        onGenerate={onGenerateVideo}
        part="stuck"
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}

      <ClipScenePrompts
        key={`${n}:${row.editedAt ?? ""}`}
        clip={row}
        language={project.language}
        dualBeat={isDualBeatSkill(project.skillSlug)}
        credits={credits}
        pending={scenePending}
        onSave={onUpdateClip}
      />

      {showDebug ? (
        <FramePromptPanel
          sceneTextEnabled={project.sceneTextEnabled}
          sceneTextLanguage={project.sceneTextLanguage}
          voiceoverLine={row.englishVo}
          frames={[start, end]}
        />
      ) : null}
    </div>
  );
}
