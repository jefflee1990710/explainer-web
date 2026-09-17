"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ProjectStepper } from "@/components/project/project-stepper";
import { StatusBadge } from "@/components/project/status-badge";
import { Spinner } from "@/components/spinner";
import { retryProjectAction } from "@/lib/actions/projects";
import { DURATION_PRESETS } from "@/lib/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { failedStepFor } from "@/lib/project-status";
import type { PublicProject } from "@/lib/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// Best available preview: clip 1 start frame → any frame → character still → upload.
export function previewImage(project: PublicProject) {
  const frames = project.frames.filter((frame) => frame.status === "completed");
  const first =
    frames.find((frame) => frame.clipNumber === 1 && frame.position === "start") ||
    frames[0];
  return (
    first?.blobUrl ||
    first?.outputUrl ||
    project.characterStillUrl ||
    project.characterImageUrl ||
    null
  );
}

export function ProjectCard({
  project,
  onUpdate,
}: {
  project: PublicProject;
  onUpdate: (project: PublicProject) => void;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const image = previewImage(project);
  const title =
    project.phaseA?.localizedTitle || project.phaseA?.englishTitle || "未命名專案";
  const failed = project.status === "failed";
  const ready = project.status === "ready";
  const firstClip = project.clips.find((clip) => clip.blobUrl || clip.outputUrl);
  const created = new Date(project.createdAt).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
  });

  async function retry() {
    setRetrying(true);
    setError("");
    const result = await retryProjectAction(project.id);
    setRetrying(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdate(result.project);
    router.refresh();
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35, ease }}
      whileHover={{ y: -3 }}
      className={`group flex flex-col overflow-hidden rounded-[1.25rem] border bg-paper/85 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)] transition-shadow hover:shadow-[6px_6px_0_0_rgba(198,242,75,0.55)] ${
        failed ? "border-accent/40" : "border-accent-ink/10"
      }`}
    >
      <Link
        href={`/app/projects/${project.id}`}
        className="relative block aspect-video overflow-hidden bg-accent-ink/5"
      >
        {ready && firstClip ? (
          <video
            src={firstClip.blobUrl || firstClip.outputUrl}
            poster={image || undefined}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={`${title} 預覽`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <Placeholder aspectRatio={project.aspectRatio} />
        )}
        <StatusBadge status={project.status} className="absolute left-3 top-3 shadow-sm" />
        {ready ? (
          <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-accent-ink/85 text-lime">
            <PlayIcon />
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/app/projects/${project.id}`} className="min-w-0">
            <h3 className="font-display line-clamp-2 text-base font-bold leading-snug">
              {title}
            </h3>
          </Link>
          <ProjectStepper
            status={project.status}
            failedAtStep={failed ? failedStepFor(project) : undefined}
            compact
          />
        </div>
        <p className="line-clamp-2 text-sm leading-5 text-muted">{project.source}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{project.aspectRatio}</span>
          <Dot />
          <span>{LANGUAGE_PRESETS[project.language].label}</span>
          <Dot />
          <span>{DURATION_PRESETS[project.durationPreset].label}</span>
          <Dot />
          <time dateTime={project.createdAt}>{created}</time>
        </div>

        {failed ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/8 px-3 py-2">
            <p className="line-clamp-1 text-xs text-accent" title={project.error}>
              {error || project.error || "產生失敗"}
            </p>
            <button
              type="button"
              onClick={() => void retry()}
              disabled={retrying}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-3 text-xs font-semibold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? <Spinner className="h-3 w-3" /> : <RetryIcon />}
              重試
            </button>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

// Empty-state art that hints at the chosen aspect ratio.
function Placeholder({ aspectRatio }: { aspectRatio: PublicProject["aspectRatio"] }) {
  const box =
    aspectRatio === "9:16" ? "h-16 w-9" : aspectRatio === "1:1" ? "h-12 w-12" : "h-9 w-16";
  return (
    <div className="studio-grid grid h-full w-full place-items-center">
      <span className={`rounded-md border-2 border-dashed border-accent-ink/25 ${box}`} />
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="h-1 w-1 rounded-full bg-accent-ink/25" />;
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
