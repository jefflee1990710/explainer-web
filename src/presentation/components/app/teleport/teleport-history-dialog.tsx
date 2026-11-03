"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo } from "react";
import type { PublicTeleportJob } from "@/model/teleport-job";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { teleportTaskTitle } from "@/service/teleport/prompts";

/** Modal dialog to browse, preview, download, and delete Teleport job history. */
export function TeleportHistoryDialog({
  open,
  onClose,
  jobs,
  activeJobId,
  onSelectJob,
  onDeleteJob,
}: {
  open: boolean;
  onClose: () => void;
  jobs: PublicTeleportJob[];
  activeJobId: string | null;
  onSelectJob: (job: PublicTeleportJob) => void;
  onDeleteJob: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeJob = useMemo(() => {
    if (jobs.length === 0) return null;
    if (activeJobId) {
      const found = jobs.find((j) => j.id === activeJobId);
      if (found) return found;
    }
    return jobs[0] ?? null;
  }, [activeJobId, jobs]);

  if (!open || typeof document === "undefined") return null;

  const host = document.getElementById("studio-dialog-root") ?? document.body;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[140] grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 id={titleId} className="font-display text-xl font-bold">
              {isEn
                ? "Teleport History"
                : "Teleport 歷史紀錄 · History"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {jobs.length === 0 ? (
            <div className="grid min-h-[18rem] place-items-center rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-8 text-center">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">
                  {isEn ? "No Teleport history yet" : "尚無 Teleport 紀錄"}
                </p>
                <p className="text-xs text-muted">
                  {isEn
                    ? "Submit a new Teleport on the main page to see your relocated clips here."
                    : "在主頁面建立新的 Teleport 換場任務後，即可在此查看與下載成片。"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr] xl:grid-cols-[22rem_1fr]">
              {/* Left Column: History List */}
              <aside className="flex flex-col gap-2.5 lg:max-h-[65dvh] lg:overflow-y-auto lg:pr-1">
                {jobs.map((job) => {
                  const selected = activeJob?.id === job.id;
                  const thumb =
                    job.preparedStartFrameUrl ||
                    job.sceneImageUrl ||
                    job.rawStartFrameUrl;
                  return (
                    <div
                      key={job.id}
                      onClick={() => onSelectJob(job)}
                      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${
                        selected
                          ? "border-2 border-accent-ink bg-white shadow-xs"
                          : "border-accent-ink/12 bg-white/60 hover:border-accent-ink/35"
                      }`}
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] font-bold text-lime">
                            MP4
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">
                          {teleportTaskTitle(job.scenePrompt)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {job.status === "completed"
                            ? isEn
                              ? "✓ Completed"
                              : "✓ 已完成影片"
                            : job.status === "rendering"
                              ? isEn
                                ? "⏳ Generating…"
                                : "⏳ 背景生成中…"
                              : isEn
                                ? "✕ Failed"
                                : "✕ 失敗"}
                          {" · "}
                          {job.sectionLength}s
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDeleteJob(job.id);
                        }}
                        aria-label={isEn ? "Delete job" : "刪除紀錄"}
                        className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-xs text-muted hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </aside>

              {/* Right Column: Active Result */}
              <section className="flex flex-col">
                {activeJob ? (
                  <div className="rounded-2xl border-2 border-accent-ink bg-white p-5 shadow-[4px_4px_0_0_#12141c]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 pb-3">
                      <div>
                        <span className="rounded-full bg-lime/40 px-2.5 py-0.5 text-[11px] font-bold text-accent-ink">
                          Teleport
                        </span>
                        <h3 className="mt-1 font-display text-lg font-bold">
                          {activeJob.status === "completed"
                            ? isEn
                              ? "Teleport is ready"
                              : "Teleport 成片已完成"
                            : activeJob.status === "failed"
                              ? isEn
                                ? "Teleport failed"
                                : "Teleport 失敗"
                              : isEn
                                ? "Relocating"
                                : "換場進行中"}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-muted">
                        {activeJob.sectionLength}s · {activeJob.aspectRatio}
                      </span>
                    </div>

                    {/* Scene still + prepared start frame */}
                    {activeJob.sceneImageUrl || activeJob.preparedStartFrameUrl ? (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {activeJob.sceneImageUrl ? (
                          <figure className="space-y-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeJob.sceneImageUrl}
                              alt=""
                              className="max-h-52 w-full rounded-xl border border-accent-ink/12 bg-zinc-900 object-contain"
                            />
                            <figcaption className="text-[11px] font-semibold text-muted">
                              {isEn ? "Scene still" : "場景照"}
                            </figcaption>
                          </figure>
                        ) : null}
                        {activeJob.preparedStartFrameUrl ? (
                          <figure className="space-y-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeJob.preparedStartFrameUrl}
                              alt=""
                              className="max-h-52 w-full rounded-xl border border-accent-ink/12 bg-zinc-900 object-contain"
                            />
                            <figcaption className="text-[11px] font-semibold text-muted">
                              {isEn ? "Prepared start frame" : "起始畫格"}
                            </figcaption>
                          </figure>
                        ) : null}
                      </div>
                    ) : null}

                    {activeJob.outputVideoUrl ? (
                      <div className="mt-4 space-y-3 rounded-2xl border border-accent-ink/15 bg-zinc-950 p-4 text-white">
                        <video
                          key={activeJob.outputVideoUrl}
                          src={activeJob.outputVideoUrl}
                          controls
                          playsInline
                          className="max-h-[28rem] w-full rounded-xl object-contain"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-white/75">
                            {isEn ? "Relocated MP4" : "已完成換場的 MP4"}
                          </span>
                          <a
                            href={activeJob.outputVideoUrl}
                            download={`teleport-${activeJob.id}.mp4`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[36px] items-center rounded-full bg-lime px-4 text-xs font-bold text-accent-ink"
                          >
                            {isEn ? "Download MP4" : "下載 MP4 影片"}
                          </a>
                        </div>
                      </div>
                    ) : activeJob.status === "failed" ? (
                      <div className="mt-4 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600">
                        {activeJob.error || (isEn ? "Generation failed." : "生成失敗，請重試")}
                      </div>
                    ) : (
                      <div className="mt-4 grid min-h-[16rem] place-items-center rounded-2xl border border-accent-ink/12 bg-paper/70 p-6 text-center">
                        <div className="max-w-md space-y-3">
                          <Spinner className="mx-auto h-7 w-7 text-accent-ink" />
                          <p className="font-display text-sm font-bold text-foreground">
                            {isEn ? "Relocating" : "換場進行中"}
                          </p>
                          <p className="text-xs text-muted">
                            {isEn
                              ? "This task is also tracked in the top background task bar. You can close this dialog and come back when it finishes."
                              : "此任務已加入頂部背景任務列，你可以關閉此視窗繼續建立其他任務，完成後會自動顯示成片。"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Failed jobs that still have a partial video also show the error */}
                    {activeJob.status === "failed" && activeJob.outputVideoUrl && activeJob.error ? (
                      <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                        {activeJob.error}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
