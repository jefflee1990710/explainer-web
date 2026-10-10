"use client";

import { ClipPrimaryAction } from "@/presentation/components/project/clip-primary-action";
import { ClipPreviewStage } from "@/presentation/components/project/clip-preview-stage";
import { ClipScenePrompts } from "@/presentation/components/project/clip-scene-prompts";
import { highlightedSceneFields } from "@/service/clip/scene-chat";
import { FramePromptPanel } from "@/presentation/components/project/frame-prompt-panel";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { ClipState } from "@/service/clip-stage";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { PublicVideo } from "@/presentation/serialize";
import type { FramePosition } from "@/model/project";

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
  onGenerateVideo,
  onCancelVideo,
  onSelect,
  region,
}: {
  project: PublicVideo;
  state: ClipState;
  credits: number;
  pending: string;
  error: string;
  nextUnfinished?: number;
  showDebug: boolean;
  onGenerateFrames: () => void;
  onOpenFrame: (position: FramePosition) => void;
  onGenerateVideo: () => void;
  onCancelVideo: () => void;
  onSelect: (clipNumber: number) => void;
  region: "preview" | "inspector";
}) {
  const { t } = useI18n();
  const n = state.clipNumber;
  const row = project.phaseA?.clips.find((item) => item.clipNumber === n);
  if (!row) return null;
  const start = project.frames.find((f) => f.clipNumber === n && f.position === "start");
  const end = project.frames.find((f) => f.clipNumber === n && f.position === "end");
  const clip = project.clips.find((c) => c.clipNumber === n);
  const framesPending = pending === `frames:${n}` || pending === `clip:${n}:regen`;
  const cancelPending = pending === `cancel-video:${n}`;
  const ownPending =
    framesPending || pending === `video:${n}` || pending.startsWith(`frame:${n}:`) || cancelPending;
  const idle = pending === "";

  if (region === "preview") {
    const ordered = [...(project.phaseA?.clips ?? [])].sort((a, b) => a.clipNumber - b.clipNumber);
    const index = ordered.findIndex((item) => item.clipNumber === n);
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
        cancelPending={cancelPending}
        onOpenFrame={onOpenFrame}
        onGenerateVideo={onGenerateVideo}
        onCancelVideo={onCancelVideo}
        prevClip={index > 0 ? ordered[index - 1].clipNumber : undefined}
        nextClip={index >= 0 && index < ordered.length - 1 ? ordered[index + 1].clipNumber : undefined}
        onSelect={onSelect}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-sm font-semibold">{t("production.clip.fileTitle", { n })}</p>
        <p className="mt-1 text-xs tabular-nums text-muted">
          {t("production.clip.meta", { timeRange: row.timeRange, durationSeconds: row.durationSeconds })}
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
        onCancelVideo={onCancelVideo}
        onSelect={onSelect}
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {translateAppError(error, t)}
        </p>
      ) : null}

      <ClipScenePrompts
        clip={row}
        language={project.language}
        dualBeat={isDualBeatSkill(project.skillSlug)}
        skillSlug={project.skillSlug}
        highlighted={highlightedSceneFields(project.sceneChats, n)}
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
