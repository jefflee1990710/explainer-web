"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideo } from "@/presentation/serialize";
import {
  computeVideoPipelineProgress,
  type VideoPipelineProgress,
  type VideoPipelineStepNumber,
} from "@/service/video-progress-steps";
import type { TranslateFn } from "@/util/i18n";

const STEP_SHORT_KEYS: Record<VideoPipelineStepNumber, string> = {
  1: "production.toolbar.pipeline.step1Short",
  2: "production.toolbar.pipeline.step2Short",
  3: "production.toolbar.pipeline.step3Short",
  4: "production.toolbar.pipeline.step4Short",
  5: "production.toolbar.pipeline.step5Short",
};

function formatStageCopy(progress: VideoPipelineProgress, t: TranslateFn) {
  const {
    stageId,
    busy,
    failed,
    locks,
    framesDone,
    framesTotal,
    framesQueued,
    framesGenerating,
    videosDone,
    videosTotal,
    videosQueued,
    videosGenerating,
  } = progress;

  if (stageId === "storyboard") {
    return {
      title: t("production.toolbar.pipeline.stage1Title"),
      detail: t("production.toolbar.pipeline.stage1Detail"),
    };
  }

  if (stageId === "locks") {
    const propsText = locks.propNames.slice(0, 3).join("、") || "Props";
    const platesText = locks.plateNames.slice(0, 3).join("、") || "3×3 Sets";
    const title = t("production.toolbar.pipeline.stage2Title");
    if (locks.propsTotal > 0 && locks.platesTotal > 0) {
      return {
        title,
        detail: t("production.toolbar.pipeline.stage2DetailBoth", {
          propsDone: locks.propsDone,
          propsTotal: locks.propsTotal,
          props: propsText,
          platesDone: locks.platesDone,
          platesTotal: locks.platesTotal,
          plates: platesText,
        }),
      };
    }
    if (locks.propsTotal > 0) {
      return {
        title,
        detail: t("production.toolbar.pipeline.stage2DetailProps", {
          propsDone: locks.propsDone,
          propsTotal: locks.propsTotal,
          props: propsText,
        }),
      };
    }
    return {
      title,
      detail: t("production.toolbar.pipeline.stage2DetailPlates", {
        platesDone: locks.platesDone,
        platesTotal: locks.platesTotal,
        plates: platesText,
      }),
    };
  }

  if (stageId === "frames") {
    const title = t("production.toolbar.pipeline.stage3Title", {
      done: framesDone,
      total: framesTotal,
    });
    if (busy) {
      return {
        title,
        detail: t("production.toolbar.pipeline.stage3DetailBusy", {
          queued: framesQueued,
          running: framesGenerating,
        }),
      };
    }
    if (failed) {
      return {
        title,
        detail: t("production.toolbar.pipeline.stage3DetailFailed", {
          done: framesDone,
          total: framesTotal,
        }),
      };
    }
    return {
      title,
      detail: t("production.toolbar.pipeline.stage3DetailIdle", {
        done: framesDone,
        total: framesTotal,
      }),
    };
  }

  if (stageId === "videos") {
    const title = t("production.toolbar.pipeline.stage4Title", {
      done: videosDone,
      total: videosTotal,
    });
    if (busy) {
      return {
        title,
        detail: t("production.toolbar.pipeline.stage4DetailBusy", {
          queued: videosQueued,
          running: videosGenerating,
        }),
      };
    }
    if (failed) {
      return {
        title,
        detail: t("production.toolbar.pipeline.stage4DetailFailed", {
          done: videosDone,
          total: videosTotal,
        }),
      };
    }
    return {
      title,
      detail: t("production.toolbar.pipeline.stage4DetailIdle", {
        framesDone,
        done: videosDone,
        total: videosTotal,
      }),
    };
  }

  return {
    title: t("production.toolbar.pipeline.stage5Title", {
      done: videosDone,
      total: videosTotal,
    }),
    detail: t("production.toolbar.pipeline.stage5Detail", {
      total: videosTotal,
    }),
  };
}

// 5-step (1/5 .. 5/5) visual stepper & detailed progress banner for the Video editor toolbar.
export function VideoStageStepper({
  project,
  onOpenTasks,
}: {
  project: PublicVideo;
  onOpenTasks?: () => void;
}) {
  const { t } = useI18n();
  const progress = computeVideoPipelineProgress(project);
  const copy = formatStageCopy(progress, t);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {/* Row 1: 5 step pills (1/5 .. 5/5) + active step title */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
            progress.failed
              ? "bg-rose-600 text-white"
              : progress.step === 5
                ? "bg-lime text-accent-ink"
                : "bg-accent-ink text-lime"
          }`}
        >
          {progress.busy ? (
            <span
              aria-hidden
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--studio-teal)]"
            />
          ) : null}
          {t("production.toolbar.pipeline.stepBadge", { step: progress.step })}
        </span>

        <div className="hidden flex-wrap items-center gap-1 md:flex" role="list">
          {progress.steps.map((item) => {
            const label = t(STEP_SHORT_KEYS[item.number]);
            const pillClass =
              item.state === "current"
                ? "border-accent-ink bg-lime/40 font-semibold text-accent-ink"
                : item.state === "done"
                  ? "border-accent-ink/20 bg-accent-ink/10 text-foreground"
                  : item.state === "failed"
                    ? "border-rose-500/40 bg-rose-500/10 font-semibold text-rose-600"
                    : "border-[var(--studio-line)] bg-transparent text-muted opacity-65";
            return (
              <span
                key={item.number}
                role="listitem"
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tabular-nums ${pillClass}`}
              >
                {item.state === "done" ? (
                  <span aria-hidden className="text-[10px] text-[var(--studio-teal)]">
                    ✓
                  </span>
                ) : item.state === "current" && progress.busy ? (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--studio-teal)]"
                  />
                ) : null}
                {label}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenTasks}
          className="text-left font-semibold text-foreground hover:underline"
        >
          {copy.title}
        </button>
      </div>

      {/* Row 2: Detailed explanation of what is happening right now */}
      <p className="text-[11px] leading-snug text-muted">{copy.detail}</p>
    </div>
  );
}
