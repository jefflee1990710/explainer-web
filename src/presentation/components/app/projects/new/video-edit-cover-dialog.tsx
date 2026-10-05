"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { VideoEditCoverPreview } from "@/presentation/components/app/projects/new/video-edit-cover-preview";
import { VideoEditCoverSafeAreas } from "@/presentation/components/app/projects/new/video-edit-cover-safe-areas";
import type { CoverSafeArea } from "@/model/project";
import { generateReelCoverAction, saveCoverSafeAreasAction } from "@/presentation/actions/video-edit";
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
  forExport = false,
  onExportQueued,
}: {
  project: PublicVideo;
  credits: number;
  onProjectChange: (project: PublicVideo) => void;
  onCreditsChange?: (delta: number) => void;
  onClose: () => void;
  // Opened from Video + Cover. Stay up until the still is ready, then the desk downloads.
  forExport?: boolean;
  onExportQueued?: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [extraPrompt, setExtraPrompt] = useState(project.coverPrompt ?? "");
  const [safeAreas, setSafeAreas] = useState<CoverSafeArea[]>(project.coverSafeAreas ?? []);
  const desiredRef = useRef(safeAreas);
  const flushing = useRef(false);
  const generating = project.coverStatus === "generating" || pending;
  const enough = credits >= FRAME_COST;
  // Once this export has queued a cover, keep the dialog until the still lands.
  const holdForExport = forExport && generating;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !holdForExport) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [holdForExport, onClose]);

  async function flushSafeAreas() {
    if (flushing.current) return;
    flushing.current = true;
    let written = desiredRef.current;
    try {
      for (;;) {
        written = desiredRef.current;
        let result: Awaited<ReturnType<typeof saveCoverSafeAreasAction>>;
        try {
          result = await saveCoverSafeAreasAction(project.id, written);
        } catch (error) {
          const saved = project.coverSafeAreas ?? [];
          desiredRef.current = saved;
          written = saved;
          setSafeAreas(saved);
          setError(error instanceof Error ? error.message : t("errors.coverSafeAreaInvalid"));
          return;
        }
        if (desiredRef.current.join() !== written.join()) continue;
        if (!result.ok) {
          const saved = project.coverSafeAreas ?? [];
          desiredRef.current = saved;
          written = saved;
          setSafeAreas(saved);
          setError(translateAppError(result.error, t));
          return;
        }
        onProjectChange(result.project);
        return;
      }
    } finally {
      flushing.current = false;
      if (desiredRef.current.join() !== written.join()) void flushSafeAreas();
    }
  }

  function toggleSafeArea(id: CoverSafeArea) {
    const current = desiredRef.current;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    desiredRef.current = next;
    setSafeAreas(next);
    setError("");
    void flushSafeAreas();
  }

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
      const result = await generateReelCoverAction(project.id, extraPrompt, safeAreas);
      if (!result.ok) {
        releaseOptimisticTasks(held);
        notifyTasksChanged();
        setError(translateAppError(result.error, t));
        return;
      }
      if (forExport) onExportQueued?.();
      onProjectChange(result.project);
      onCreditsChange?.(-FRAME_COST);
      notifyTasksChanged();
      if (!forExport) onClose();
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
    <DialogBackdrop
      className="grid place-items-center bg-black/40 p-4"
      onClick={() => {
        if (!holdForExport) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="grid max-h-[min(44rem,90vh)] w-full max-w-4xl overflow-hidden rounded-xl border border-[var(--studio-line)] bg-white shadow-lg lg:grid-cols-[22rem_minmax(0,1fr)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--studio-line)] p-4 lg:col-span-2">
          <VideoEditCoverSafeAreas
            selected={safeAreas}
            disabled={generating}
            onToggle={toggleSafeArea}
          />
        </div>
        <div className="flex min-h-0 flex-col overflow-y-auto p-4">
          <h2 id={titleId} className="text-sm font-semibold">
            {t("video.cover.title")}
          </h2>
          <p className="mt-1 text-xs text-[var(--studio-muted)]">{t("video.cover.body")}</p>
          {forExport ? (
            <p className="mt-2 text-xs font-semibold text-[var(--studio-ink)]">{t("video.export.stayForCover")}</p>
          ) : null}
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
            <StudioButton variant="ghost" disabled={holdForExport} onClick={onClose}>
              {t("common.cancel")}
            </StudioButton>
            <StudioButton disabled={generating || !enough} onClick={() => void generate()}>
              {generating ? <Spinner className="h-3.5 w-3.5" /> : null}
              {generating ? t("video.cover.generating") : t("video.cover.generate", { credits: FRAME_COST })}
            </StudioButton>
          </div>
        </div>
        <VideoEditCoverPreview
          src={project.coverUrl}
          aspectRatio={project.aspectRatio}
          emptyLabel={generating ? t("video.cover.generating") : t("video.cover.empty")}
          label={t("video.cover.current")}
        />
      </div>
    </DialogBackdrop>
  );
}
