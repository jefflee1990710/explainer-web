"use client";

import Link from "next/link";
import { ClipVideoPanel } from "@/presentation/components/project/clip-video-panel";
import {
  ClipScenePrompts,
  type ClipScenePending,
} from "@/presentation/components/project/clip-scene-prompts";
import { FramePromptPanel } from "@/presentation/components/project/frame-prompt-panel";
import { FrameTile } from "@/presentation/components/project/frame-tile";
import { ArrowIcon, RefreshIcon, WarnIcon } from "@/presentation/components/project/production-icons";
import { Spinner } from "@/presentation/components/spinner";
import type { ClipState } from "@/service/clip-stage";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { FRAMES_COST } from "@/service/production-plan";
import type { PublicVideo } from "@/presentation/serialize";
import type { ClipStoryboardInput, FramePosition } from "@/model/project";

// One clip split across the preview pane and the inspector.
export function ClipWorkspace({
  project,
  state,
  credits,
  pending,
  error,
  onGenerateFrames,
  onRegenerateFrame,
  onOpenFrame,
  onUpdateClip,
  onGenerateVideo,
  region,
}: {
  project: PublicVideo;
  state: ClipState;
  credits: number;
  // Pending key of the running action ("" when idle).
  pending: string;
  error: string;
  onGenerateFrames: () => void;
  onRegenerateFrame: (position: FramePosition) => void;
  onOpenFrame: (position: FramePosition) => void;
  onUpdateClip: (input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>;
  onGenerateVideo: () => void;
  // Preview is the center pane; inspector is the right pane.
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

  const framesBusy = state.stage === "frames_generating" || state.stage === "video_generating";
  const framesPending = pending === `frames:${n}` || pending === `clip:${n}:regen`;
  const hasFrames = Boolean(start || end);
  const nextHasFrames = project.frames.some((f) => f.clipNumber === n + 1);
  // Not being subscribed no longer disables anything: the action returns a
  // billing error and the caller redirects to /app/billing.
  const idle = pending === "";
  const shortCredits = credits < FRAMES_COST;
  const framesDisabled = framesBusy || !idle || shortCredits;

  return region === "preview" ? (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-center gap-3">
        <div className="w-28 shrink-0 sm:w-40">
        <FrameTile
          frame={start}
          position="start"
          aspectRatio={project.aspectRatio}
          canRegenerate={!framesBusy && idle}
          pending={pending === `frame:${n}:start` || framesPending}
          stale={state.stale.frames}
          onRegenerate={() => onRegenerateFrame("start")}
          onOpen={() => onOpenFrame("start")}
        />
        </div>
        <span className="flex w-16 items-center text-[var(--studio-muted)] sm:w-36" aria-hidden>
          <span className="h-px flex-1 bg-current" />
          <ArrowIcon className="h-4 w-4 shrink-0" />
        </span>
        <div className="w-28 shrink-0 sm:w-40">
        <FrameTile
          frame={end}
          position="end"
          aspectRatio={project.aspectRatio}
          canRegenerate={!framesBusy && idle}
          pending={pending === `frame:${n}:end` || framesPending}
          stale={state.stale.frames}
          onRegenerate={() => onRegenerateFrame("end")}
          onOpen={() => onOpenFrame("end")}
        />
        </div>
      </div>
      <ClipVideoPanel
        clip={clip}
        state={state}
        aspectRatio={project.aspectRatio}
        credits={credits}
        canAct={idle}
        pending={pending === `video:${n}`}
        onGenerate={onGenerateVideo}
        part="player"
      />
    </div>
  ) : (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-sm font-semibold">Clip{n}.mp4</p>
        <p className="mt-1 text-xs tabular-nums text-muted">
          {row.timeRange} · {row.durationSeconds} 秒
        </p>
      </header>

      {state.stale.frames || state.stale.video ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-md border border-accent/40 bg-accent/10 px-3 py-3 text-sm"
        >
          <span className="inline-flex items-start gap-2">
            <WarnIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {state.stale.frames
              ? "分鏡文字在畫格之後修改過。下面的畫格與影片是舊版，仍可查看；要套用新文字請重畫。"
              : "畫格在影片之後重畫過。影片是舊版，仍可播放；要套用新畫格請重產影片。"}
          </span>
          {state.stale.frames ? (
            <button
              type="button"
              onClick={onGenerateFrames}
              disabled={framesDisabled}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-md bg-[var(--studio-ink)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {framesPending ? <Spinner className="h-3.5 w-3.5" /> : <RefreshIcon />}
              重畫兩張 · {FRAMES_COST}
            </button>
          ) : null}
        </div>
      ) : null}

      <ClipScenePrompts
        clip={row}
        language={project.language}
        dualBeat={isDualBeatSkill(project.skillSlug)}
        credits={credits}
        pending={scenePending}
        error={error}
        onSave={onUpdateClip}
      />

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          畫格 ·{" "}
          {state.stage === "no_frames"
            ? "尚未產生"
            : state.stage === "frames_generating"
              ? "生成中"
              : state.stage === "frames_failed"
                ? "有一張失敗"
                : "已完成"}
        </p>
        <button
          type="button"
          onClick={onGenerateFrames}
          disabled={framesDisabled}
          className={`mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
            hasFrames
              ? "border border-[var(--studio-line)] bg-[var(--studio-panel)]"
              : "bg-[var(--studio-ink)] text-white"
          }`}
        >
          {framesPending ? <Spinner className="h-4 w-4" /> : hasFrames ? <RefreshIcon /> : null}
          {hasFrames ? "兩張重畫" : "畫這段畫格"} · {FRAMES_COST}
        </button>
        <p className="mt-1 text-[11px] text-muted">
          {shortCredits ? (
            <>
              credits 不足，
              <Link href="/app/billing" className="font-semibold text-accent underline">
                升級方案
              </Link>
            </>
          ) : framesBusy ? (
            "這一段正在生成中，完成後才能重畫"
          ) : nextHasFrames ? (
            `結尾畫格與 #${n + 1} 的起始銜接；重畫後建議看一下 #${n + 1}。`
          ) : (
            "點擊完成的畫格可放大、手繪標註後重畫（1 credit）。"
          )}
        </p>
        <FramePromptPanel
          sceneTextEnabled={project.sceneTextEnabled}
          sceneTextLanguage={project.sceneTextLanguage}
          voiceoverLine={row.englishVo}
          frames={[start, end]}
        />
      </div>

      <ClipVideoPanel
        clip={clip}
        state={state}
        aspectRatio={project.aspectRatio}
        credits={credits}
        canAct={idle}
        pending={pending === `video:${n}`}
        onGenerate={onGenerateVideo}
        part="actions"
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
