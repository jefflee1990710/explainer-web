"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useId } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { ExportJob, ExportPhase } from "@/presentation/components/app/projects/new/browser-video-export";

const PHASE_LABEL: Record<ExportPhase, string> = {
  encoder: "video.export.phaseEncoder",
  download: "video.export.phaseDownload",
  join: "video.export.phaseJoin",
  encode: "video.export.phaseEncode",
  save: "video.export.phaseSave",
};

function jobCaption(job: ExportJob, t: (key: string, params?: { current: number; total: number }) => string) {
  if (job.detailKey && job.detail) return t(job.detailKey, job.detail);
  return t(PHASE_LABEL[job.phase]);
}

// Blocks the editor while a browser export runs, and names the current stage.
export function ExportProgressOverlay({
  job,
  onCancel,
}: {
  job: ExportJob;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const percent = Math.round(Math.max(0, Math.min(1, job.ratio)) * 100);
  const activeIndex = job.phases.indexOf(job.phase);
  const caption = jobCaption(job, t);

  return (
    <DialogBackdrop className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
      >
        <h2 id={titleId} className="font-display text-xl font-bold">
          {t("video.export.progressTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("video.export.stayOpen")}</p>
        <ol className="mt-5 space-y-3">
          {job.phases.map((phase, index) => {
            const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
            return (
              <li key={phase} className="flex items-center gap-3 text-sm">
                <StageMark state={state} />
                <span className={state === "pending" ? "text-muted" : "font-semibold"}>
                  {state === "active" ? caption : t(PHASE_LABEL[phase])}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
            <span>{caption}</span>
            <span className="tabular-nums">{t("video.export.percent", { n: percent })}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--studio-fill)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={caption}
          >
            <div className="h-full rounded-full bg-lime transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={job.phase === "save"}
          className="mt-5 inline-flex min-h-9 cursor-pointer items-center rounded-full border border-accent-ink/15 px-4 text-sm font-semibold transition hover:bg-[var(--studio-fill)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("video.export.cancel")}
        </button>
      </div>
    </DialogBackdrop>
  );
}

function StageMark({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "active") {
    return <Spinner className="h-4 w-4 shrink-0 text-accent" />;
  }
  return (
    <span
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
        state === "done" ? "bg-lime text-[#12141c]" : "border border-accent-ink/20 text-transparent"
      }`}
      aria-hidden
    >
      ✓
    </span>
  );
}
