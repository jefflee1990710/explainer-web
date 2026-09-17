"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Spinner } from "@/components/spinner";
import type { PublicProject } from "@/lib/serialize";
import { ClipPlayer } from "../[id]/clip-player";

const ease = [0.22, 1, 0.36, 1] as const;

const CLIP_LABEL: Record<string, string> = {
  queued: "排隊中",
  in_progress: "生成中",
  completed: "完成",
  failed: "失敗",
};

// Live clip-by-clip progress; swaps to the player when everything is ready.
export function GenerationPanel({ project }: { project: PublicProject }) {
  const total = project.phaseA?.clipCount || project.clips.length;
  const done = project.clips.filter((clip) => clip.status === "completed").length;
  const ratio = total > 0 ? done / total : 0;
  const ready = project.status === "ready";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
      className="space-y-5"
    >
      <div
        role="status"
        aria-live="polite"
        className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Phase B · 產片
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold">
              {ready ? "影片完成" : project.status === "failed" ? "產片失敗" : "正在產出 clips"}
            </h2>
          </div>
          {!ready && project.status !== "failed" ? (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-ink text-lime">
              <Spinner className="h-5 w-5" />
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-ink/10">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, ratio * 100)}%` }}
              transition={{ duration: 0.6, ease }}
            />
          </div>
          <span className="font-display text-sm font-bold tabular-nums">
            {done}/{total}
          </span>
        </div>

        {project.characterStillUrl ? (
          <motion.figure
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-5 flex items-center gap-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.characterStillUrl}
              alt="角色定裝圖"
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl border border-accent-ink/10 object-cover"
            />
            <figcaption className="text-sm text-muted">
              角色定裝已鎖定，接下來每段 clip 都會沿用這個角色。
            </figcaption>
          </motion.figure>
        ) : null}

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {(project.clips.length
            ? project.clips
            : Array.from({ length: total }, (_, index) => ({
                clipNumber: index + 1,
                status: "queued" as const,
                error: undefined,
              }))
          ).map((clip) => (
            <motion.li
              key={clip.clipNumber}
              layout
              className="flex items-center justify-between rounded-xl border border-accent-ink/10 bg-paper px-3 py-2 text-sm"
            >
              <span className="font-medium">Clip {clip.clipNumber}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  clip.status === "completed"
                    ? "bg-lime text-accent-ink"
                    : clip.status === "failed"
                      ? "bg-accent text-white"
                      : "bg-accent-ink/5 text-muted"
                }`}
              >
                {clip.status === "in_progress" ? <Spinner className="h-3 w-3" /> : null}
                {CLIP_LABEL[clip.status] || clip.status}
              </span>
            </motion.li>
          ))}
        </ul>

        {project.error ? (
          <p role="alert" className="mt-4 text-sm font-medium text-accent">
            {project.error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/app/projects/${project.id}`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            開啟專案頁
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
          >
            回到專案列表
          </Link>
        </div>
      </div>

      {ready ? <ClipPlayer project={project} /> : null}
    </motion.section>
  );
}
