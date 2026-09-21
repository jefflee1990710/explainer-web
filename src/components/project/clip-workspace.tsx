"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ClipVideoPanel } from "@/components/project/clip-video-panel";
import {
  ClipScenePrompts,
  type ClipScenePending,
} from "@/components/project/clip-scene-prompts";
import { FramePromptPanel } from "@/components/project/frame-prompt-panel";
import { FrameTile } from "@/components/project/frame-tile";
import { ArrowIcon, RefreshIcon, WarnIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { ClipState } from "@/lib/clip-stage";
import { isDualBeatSkill } from "@/lib/director/dual-beat";
import { FRAMES_COST } from "@/lib/production-plan";
import type { PublicVideo } from "@/lib/serialize";
import type { ClipStoryboardInput, FramePosition } from "@/types/project";

const ease = [0.22, 1, 0.36, 1] as const;

// One clip: storyboard text | start+end frames | video. Every paid button
// carries its cost; stale media shows a banner instead of a lock.
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

  return (
    <motion.section
      key={n}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-5 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-accent-ink px-2.5 py-1 font-display text-xs font-bold text-lime">
          Clip #{n}
        </span>
        <span className="text-xs tabular-nums text-muted">
          {row.timeRange} · {row.durationSeconds} 秒
        </span>
      </header>

      {/* Stale banner: text changed after the media was made. */}
      {state.stale.frames || state.stale.video ? (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
        >
          <span className="inline-flex items-center gap-2">
            <WarnIcon className="h-4 w-4 text-accent" />
            {state.stale.frames
              ? "分鏡文字在畫格之後修改過。下面的畫格與影片是舊版，仍可查看；要套用新文字請重畫。"
              : "畫格在影片之後重畫過。影片是舊版，仍可播放；要套用新畫格請重產影片。"}
          </span>
          {state.stale.frames ? (
            <button
              type="button"
              onClick={onGenerateFrames}
              disabled={framesDisabled}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-3 text-xs font-semibold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {framesPending ? <Spinner className="h-3.5 w-3.5" /> : <RefreshIcon />}
              重畫兩張 · {FRAMES_COST}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1.3fr_1fr]">
        <ClipScenePrompts
          clip={row}
          language={project.language}
          dualBeat={isDualBeatSkill(project.skillSlug)}
          credits={credits}
          pending={scenePending}
          error={error}
          onSave={onUpdateClip}
        />

        {/* Frames */}
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            畫格 ·{" "}
            {state.stage === "no_frames"
              ? "尚未產生"
              : state.stage === "frames_generating"
                ? "生成中"
                : state.stage === "frames_failed"
                  ? "有一張失敗"
                  : "已完成"}
          </p>
          <div className="mt-2 grid grid-cols-[1fr_20px_1fr] items-center gap-2">
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
            <ArrowIcon />
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
          <motion.button
            type="button"
            onClick={onGenerateFrames}
            disabled={framesDisabled}
            whileTap={{ scale: 0.98 }}
            className={`mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              hasFrames
                ? "border border-accent-ink/15 bg-paper hover:border-accent-ink/40"
                : "bg-accent text-white shadow-[3px_3px_0_0_#12141c] hover:-translate-y-0.5 disabled:hover:translate-y-0"
            }`}
          >
            {framesPending ? <Spinner className="h-4 w-4" /> : hasFrames ? <RefreshIcon /> : null}
            {hasFrames ? "兩張重畫" : "畫這段畫格"} · {FRAMES_COST}
          </motion.button>
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

        {/* Video */}
        <ClipVideoPanel
          clip={clip}
          state={state}
          aspectRatio={project.aspectRatio}
          credits={credits}
          canAct={idle}
          pending={pending === `video:${n}`}
          onGenerate={onGenerateVideo}
        />
      </div>
    </motion.section>
  );
}
