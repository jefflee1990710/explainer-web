"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Spinner } from "@/presentation/components/spinner";
import { isReelBusy, isReelCurrent } from "@/service/reel/fingerprint";
import type { PublicVideo } from "@/presentation/serialize";
import { ReelPlayer } from "@/presentation/components/app/projects/new/reel-player";

const ease = [0.22, 1, 0.36, 1] as const;

function reelFilename(project: PublicVideo) {
  const raw =
    project.phaseA?.localizedTitle || project.phaseA?.englishTitle || "reel";
  const safe = raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || "reel";
  return `${safe}.mp4`;
}

// Step 4: concatenate every clip into one reel, then preview + download.
export function ReelExport({
  project,
  pending,
  error,
  onCompose,
  part = "all",
}: {
  project: PublicVideo;
  pending: string;
  error: string;
  onCompose: () => void;
  // Preview is the player; inspector is the status and retry control.
  part?: "all" | "preview" | "inspector";
}) {
  const current = isReelCurrent(project);
  const composing = isReelBusy(project.reelStatus) || pending === "reel";
  const failed = project.reelStatus === "failed" && !current;
  const clipCount = project.phaseA?.clips.length || project.clips.length;

  useEffect(() => {
    if (part === "preview") return;
    if (current || composing || failed) return;
    onCompose();
  }, [current, composing, failed, onCompose, part]);

  const player = current && project.reelUrl ? (
    <ReelPlayer
      src={project.reelUrl}
      aspectRatio={project.aspectRatio}
      filename={reelFilename(project)}
    />
  ) : composing ? (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner className="h-6 w-6" />
      <p>正在把 {clipCount} 段接成一支影片，完成後可預覽與下載。</p>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted">
      <p>
        {failed
          ? project.reelError || "合成失敗，credits 不會被扣除，可以再試。"
          : "準備把所有片段合成一支成片。"}
      </p>
    </div>
  );

  const status = (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--studio-teal)]">
          Export · 成片
        </p>
        <h2 className="mt-2 text-lg font-bold">
          {current ? "成片已就緒" : composing ? "正在合成成片" : "合成一支完整影片"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          依分鏡順序把 {clipCount} 段接成一支 reel。片段重做後會再合成一次。
        </p>
      </header>
      {!current ? (
        <button
          type="button"
          onClick={onCompose}
          disabled={pending === "reel" || composing}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--studio-ink)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "reel" || composing ? <Spinner /> : null}
          {failed ? "重新合成" : "開始合成"}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );

  if (part === "preview") return <div className="p-4">{player}</div>;
  if (part === "inspector") return status;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
      className="space-y-5"
    >
      {status}
      <div className="rounded-md border border-[var(--studio-line)] bg-[var(--studio-panel)] p-4">
        {player}
      </div>
    </motion.section>
  );
}
