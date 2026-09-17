"use client";

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

// Title, status badge, stepper and (when failed) a retry card for the project page.
export function ProjectHeader({
  project,
  skillTitle,
}: {
  project: PublicProject;
  skillTitle: string;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const failed = project.status === "failed";
  const failedStep = failed ? failedStepFor(project) : undefined;

  async function retry() {
    setRetrying(true);
    setError("");
    const result = await retryProjectAction(project.id);
    setRetrying(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{skillTitle}</p>
          <h1 className="font-display mt-1 text-3xl font-bold">
            {project.phaseA?.localizedTitle || "解說提案"}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{project.aspectRatio}</span>
            <Dot />
            <span>{LANGUAGE_PRESETS[project.language].label}</span>
            <Dot />
            <span>{DURATION_PRESETS[project.durationPreset].label}</span>
          </p>
        </div>
        <StatusBadge status={project.status} className="mt-1" />
      </div>

      <div className="rounded-2xl border border-accent-ink/10 bg-paper/70 px-5 py-4">
        <ProjectStepper status={project.status} failedAtStep={failedStep} />
      </div>

      {failed ? (
        <motion.section
          role="alert"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-accent/40 bg-paper/85 p-5 shadow-[6px_6px_0_0_rgba(255,77,46,0.35)]"
        >
          <div>
            <p className="font-display text-lg font-bold text-accent">這次沒有成功</p>
            <p className="mt-1 text-sm text-muted">{error || project.error || "請再試一次。"}</p>
            <p className="mt-1 text-xs text-muted">
              失敗階段的 credits 已自動退回，重試不會重複扣款。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={retrying}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 py-2 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {retrying ? <Spinner /> : null}
            {failedStep === 1
              ? "重新產生分鏡"
              : failedStep === 2
                ? "回到分鏡，重畫分鏡圖"
                : "回到分鏡圖，重新產片"}
          </button>
        </motion.section>
      ) : null}
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="h-1 w-1 rounded-full bg-accent-ink/30" />;
}
