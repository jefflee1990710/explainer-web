"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { ProjectStatus } from "@/model/project";
import type { GenerationDetailTag, GenerationTagState } from "@/service/clip-stage";
import type { TranslateFn } from "@/util/i18n";

type ProgressStep = {
  key: string;
  state: GenerationTagState;
  label: string;
};

// One continuous fill on the card's top edge. Finished steps sit together
// on the left; the rest of the track stays empty.
export function VideoGenerationProgress({
  tags,
  status,
}: {
  tags: GenerationDetailTag[];
  status: ProjectStatus;
}) {
  const { t } = useI18n();
  const steps = progressSteps(tags, status, t);
  if (steps.length === 0) return null;

  const total = steps.length;
  const done = steps.filter((step) => step.state === "ready").length;
  const busy = steps.find((step) => step.state === "busy");
  const failed = steps.some((step) => step.state === "failed");
  // Count the in-flight step so a job that just started still shows a sliver.
  const filled = Math.min(total, done + (busy ? 1 : 0));
  const label = busy
    ? t("video.card.generationProgressBusy", { done, total, step: busy.label })
    : t("video.card.generationProgress", { done, total });

  return (
    <>
      <span className="sr-only">{label}</span>
      <div aria-hidden title={label} className="absolute inset-x-0 top-0 z-10 h-1.5 bg-black/25">
        <span
          className={`block h-full ${fillClass(failed, done, Boolean(busy))}`}
          style={{ width: `${(filled / total) * 100}%` }}
        />
      </div>
    </>
  );
}

function progressSteps(
  tags: GenerationDetailTag[],
  status: ProjectStatus,
  t: TranslateFn,
): ProgressStep[] {
  if (tags.length > 0) {
    return tags.map((tag) => ({
      key: `${tag.kind}-${tag.clipNumber}`,
      state: tag.state,
      label:
        tag.kind === "scene"
          ? t("video.card.tagScene", { n: tag.clipNumber })
          : t("video.card.tagVideo", { n: tag.clipNumber }),
    }));
  }
  // No clips yet: one step while the storyboard is writing, or when generation failed first.
  if (status === "phase_a") {
    return [{ key: "storyboard", state: "busy", label: t("project.status.phase_a") }];
  }
  if (status === "failed") {
    return [{ key: "failed", state: "failed", label: t("project.status.failed") }];
  }
  return [];
}

function fillClass(failed: boolean, done: number, busy: boolean) {
  if (failed && done === 0 && !busy) return "bg-[#e11d48]";
  if (busy) return "animate-pulse bg-[var(--studio-teal)] motion-reduce:animate-none";
  return "bg-[var(--studio-teal)]";
}
