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
}: {
  project: PublicVideo;
  pending: string;
  error: string;
  onCompose: () => void;
}) {
  const current = isReelCurrent(project);
  const composing = isReelBusy(project.reelStatus) || pending === "reel";
  const failed = project.reelStatus === "failed" && !current;
  const clipCount = project.phaseA?.clips.length || project.clips.length;

  // Auto-start concat the first time this fingerprint has no reel.
  useEffect(() => {
    if (current || composing || failed) return;
    onCompose();
  }, [current, composing, failed, onCompose]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
      className="space-y-5"
    >
      <header className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
          Export · 成片
        </p>
        <h2 className="font-display mt-2 text-2xl font-bold">
          {current ? "成片已就緒" : composing ? "正在合成成片" : "合成一支完整影片"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          依分鏡順序把 {clipCount} 段接成一支 reel。片段重做後會再合成一次。
        </p>
      </header>

      <div className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        {current && project.reelUrl ? (
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
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-sm text-muted">
              {failed
                ? project.reelError || "合成失敗，credits 不會被扣除，可以再試。"
                : "準備把所有片段合成一支成片。"}
            </p>
            <motion.button
              type="button"
              onClick={onCompose}
              disabled={pending === "reel"}
              whileTap={{ scale: 0.98 }}
              className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "reel" ? <Spinner /> : null}
              {failed ? "重新合成" : "開始合成"}
            </motion.button>
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
    </motion.section>
  );
}
