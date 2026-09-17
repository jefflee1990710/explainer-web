"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/spinner";
import { refreshGenerationAction } from "@/lib/actions/generation";
import type { PublicProject } from "@/lib/serialize";

const IN_FLIGHT = new Set<PublicProject["status"]>([
  "phase_a",
  "frames_generating",
  "approved",
  "generating",
]);

const CLIP_LABEL: Record<string, string> = {
  queued: "排隊中",
  in_progress: "生成中",
  completed: "完成",
  failed: "失敗",
};

// Polls while any background job runs; refreshes the server-rendered page
// once the status settles so the storyboard/player appear without a reload.
export function GenerationProgress({
  project: initial,
}: {
  project: PublicProject;
}) {
  const router = useRouter();
  const [polled, setPolled] = useState<PublicProject | null>(null);
  const project = polled && polled.id === initial.id ? polled : initial;
  const lastStatus = useRef(project.status);

  useEffect(() => {
    if (!IN_FLIGHT.has(project.status)) return;
    const interval = project.status === "generating" ? 4000 : 2500;
    const timer = window.setInterval(() => {
      void refreshGenerationAction(project.id).then((result) => {
        if (!result.ok) return;
        setPolled(result.project);
        // Frames are rendered server-side by FramesStep, so refresh on every
        // change while they stream in; otherwise only on status change.
        const framesChanged =
          result.project.status === "frames_generating" &&
          JSON.stringify(result.project.frames) !== JSON.stringify(project.frames);
        if (result.project.status !== lastStatus.current || framesChanged) {
          lastStatus.current = result.project.status;
          router.refresh();
        }
      });
    }, interval);
    return () => window.clearInterval(timer);
  }, [project.id, project.status, project.frames, router]);

  if (project.status === "phase_a" || project.status === "approved") {
    return (
      <section
        role="status"
        aria-live="polite"
        className="flex items-center gap-4 rounded-[1.5rem] border border-accent-ink/10 bg-accent-ink p-5 text-paper shadow-[6px_6px_0_0_rgba(255,77,46,0.9)]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime text-accent-ink">
          <Spinner className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display font-bold">
            {project.status === "phase_a" ? "導演正在寫分鏡" : "正在準備產片"}
          </p>
          <p className="text-sm text-paper/70">完成後會自動更新這一頁。</p>
        </div>
      </section>
    );
  }

  // Failed projects are handled by ProjectHeader's retry card; only show
  // the clip list here while video is actually in flight.
  if (project.status !== "generating") {
    return null;
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-bold">產片進度</h2>
        {project.status === "generating" ? <Spinner className="h-5 w-5" /> : null}
      </div>
      {project.error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-accent">
          {project.error}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          正在產角色定裝圖與各段 clips。完成後可連續播放。
        </p>
      )}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {project.clips.map((clip) => (
          <li
            key={clip.clipNumber}
            className="flex items-center justify-between rounded-xl border border-accent-ink/10 bg-paper px-3 py-2 text-sm"
          >
            <span className="font-medium">Clip {clip.clipNumber}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                clip.status === "completed"
                  ? "bg-lime text-accent-ink"
                  : clip.status === "failed"
                    ? "bg-accent text-white"
                    : "bg-accent-ink/5 text-muted"
              }`}
            >
              {CLIP_LABEL[clip.status] || clip.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
