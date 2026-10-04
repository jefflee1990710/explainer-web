"use client";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { generateReelCoverAction } from "@/presentation/actions/video-edit";
import {
  holdOptimisticTasks,
  paidKeyTasks,
  releaseOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import { beginTaskRefresh, endTaskRefresh } from "@/presentation/components/app/tasks/task-refresh";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { FRAME_COST } from "@/service/credit-costs";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { PublicVideo } from "@/presentation/serialize";

// Queue a reel thumbnail, then close. The shared task poller finishes it.
export function VideoEditCoverDialog({
  project,
  credits,
  onProjectChange,
  onCreditsChange,
  onClose,
}: {
  project: PublicVideo;
  credits: number;
  onProjectChange: (project: PublicVideo) => void;
  onCreditsChange?: (delta: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [extraPrompt, setExtraPrompt] = useState(project.coverPrompt ?? "");
  const generating = project.coverStatus === "generating" || pending;
  const enough = credits >= FRAME_COST;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function generate() {
    if (generating || !enough) return;
    setError("");
    setPending(true);
    const held = holdOptimisticTasks(
      paidKeyTasks({
        videoId: project.id,
        projectId: project.projectId,
        title: project.phaseA?.localizedTitle || t("brief.fallback.unnamedVideo"),
        keys: ["cover"],
      }),
    );
    beginTaskRefresh();
    notifyTasksChanged();
    try {
      const result = await generateReelCoverAction(project.id, extraPrompt);
      if (!result.ok) {
        releaseOptimisticTasks(held);
        notifyTasksChanged();
        setError(translateAppError(result.error, t));
        return;
      }
      onProjectChange(result.project);
      onCreditsChange?.(-FRAME_COST);
      notifyTasksChanged();
      onClose();
    } catch {
      releaseOptimisticTasks(held);
      notifyTasksChanged();
      setError(t("errors.coverFailed"));
    } finally {
      endTaskRefresh();
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-[var(--studio-line)] bg-white p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-sm font-semibold">
          {t("video.cover.title")}
        </h2>
        <p className="mt-1 text-xs text-[var(--studio-muted)]">{t("video.cover.body")}</p>
        <label className="mt-3 block">
          <span className="text-xs font-semibold">{t("video.cover.promptLabel")}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--studio-muted)]">{t("video.cover.promptHint")}</span>
          <textarea
            value={extraPrompt}
            rows={3}
            disabled={generating}
            placeholder={t("video.cover.promptPlaceholder")}
            onChange={(event) => setExtraPrompt(event.target.value)}
            className="mt-1.5 w-full resize-y rounded-lg border border-[var(--studio-line)] bg-white px-2 py-1.5 text-xs leading-5 text-[var(--studio-ink)] disabled:opacity-60"
          />
        </label>
        <div className="mt-3 overflow-hidden rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)]">
          {project.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.coverUrl} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <p className="grid aspect-video place-items-center px-3 text-center text-xs text-[var(--studio-muted)]">
              {generating ? t("video.cover.generating") : t("video.cover.empty")}
            </p>
          )}
        </div>
        {project.coverStatus === "failed" && !generating ? (
          <p role="alert" className="mt-2 text-xs font-medium text-[#e11d48]">
            {t("video.cover.failed")}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-xs font-medium text-[#e11d48]">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <StudioButton variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </StudioButton>
          <StudioButton disabled={generating || !enough} onClick={() => void generate()}>
            {generating ? <Spinner className="h-3.5 w-3.5" /> : null}
            {generating ? t("video.cover.generating") : t("video.cover.generate", { credits: FRAME_COST })}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
