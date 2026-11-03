"use client";

import { useMemo } from "react";
import type { PublicTeleportJob } from "@/model/teleport-job";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { teleportTaskTitle } from "@/service/teleport/prompts";

/**
 * Reusable Teleport history & active-result panel.
 * Rendered directly as a sticky right-hand column on desktop (`lg+`) and inside `TeleportHistoryDialog` on mobile.
 */
export function TeleportHistoryPanel({
  jobs,
  activeJobId,
  onSelectJob,
  onDeleteJob,
  layout = "sidebar",
}: {
  jobs: PublicTeleportJob[];
  activeJobId: string | null;
  onSelectJob: (job: PublicTeleportJob) => void;
  onDeleteJob: (id: string) => void;
  layout?: "sidebar" | "modal";
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";

  const activeJob = useMemo(() => {
    if (jobs.length === 0) return null;
    if (activeJobId) {
      const found = jobs.find((j) => j.id === activeJobId);
      if (found) return found;
    }
    return jobs[0] ?? null;
  }, [activeJobId, jobs]);

  const isSidebar = layout === "sidebar";

  return (
    <div
      className={
        isSidebar
          ? "flex flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[4px_4px_0_0_#12141c]"
          : "space-y-4"
      }
    >
      {/* Header */}
      {isSidebar ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 bg-paper/85 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold text-foreground">
              {isEn ? "Teleport History" : "歷史紀錄 History"}
            </h2>
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent-ink/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted">
              {jobs.length}
            </span>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className={isSidebar ? "space-y-4 p-4" : ""}>
        {jobs.length === 0 ? (
          <div className="grid min-h-[14rem] place-items-center rounded-2xl border border-dashed border-accent-ink/20 bg-paper/60 p-6 text-center">
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-foreground">
                {isEn ? "No Teleport history yet" : "尚無 Teleport 紀錄"}
              </p>
              <p className="text-xs text-muted">
                {isEn
                  ? "Submit a new Teleport on the left to see your relocated clips here."
                  : "建立新的 Teleport 換場任務後，即可在此即時查看進度與下載成片。"}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={
              isSidebar
                ? "flex flex-col gap-4"
                : "grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr] xl:grid-cols-[22rem_1fr]"
            }
          >
            {/* Active Result Card */}
            {activeJob ? (
              <section className={isSidebar ? "order-1" : "order-2 flex flex-col"}>
                <div className="rounded-2xl border border-accent-ink/15 bg-paper/55 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 pb-2.5">
                    <div className="min-w-0">
                      <span className="rounded-full bg-lime/50 px-2 py-0.5 text-[10px] font-bold text-accent-ink">
                        Teleport
                      </span>
                      <h3 className="mt-1 truncate font-display text-sm font-bold">
                        {activeJob.status === "completed"
                          ? isEn
                            ? "Teleport is ready"
                            : "Teleport 成片已完成"
                          : activeJob.status === "failed"
                            ? isEn
                              ? "Teleport failed"
                              : "Teleport 失敗"
                            : isEn
                              ? "Relocating…"
                              : "換場進行中…"}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-muted">
                      {activeJob.sectionLength}s · {activeJob.aspectRatio}
                    </span>
                  </div>

                  {/* Scene still + prepared start frame */}
                  {activeJob.sceneImageUrl || activeJob.preparedStartFrameUrl ? (
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      {activeJob.sceneImageUrl ? (
                        <figure className="space-y-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeJob.sceneImageUrl}
                            alt=""
                            className="max-h-36 w-full rounded-lg border border-accent-ink/12 bg-zinc-900 object-contain"
                          />
                          <figcaption className="text-[10px] font-semibold text-muted">
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
                            className="max-h-36 w-full rounded-lg border border-accent-ink/12 bg-zinc-900 object-contain"
                          />
                          <figcaption className="text-[10px] font-semibold text-muted">
                            {isEn ? "Prepared start frame" : "起始畫格"}
                          </figcaption>
                        </figure>
                      ) : null}
                    </div>
                  ) : null}

                  {activeJob.outputVideoUrl ? (
                    <div className="mt-3 space-y-2.5 rounded-xl border border-accent-ink/15 bg-zinc-950 p-3 text-white">
                      <video
                        key={activeJob.outputVideoUrl}
                        src={activeJob.outputVideoUrl}
                        controls
                        playsInline
                        className="max-h-80 w-full rounded-lg object-contain"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-white/75">
                          {isEn ? "Relocated MP4" : "已完成換場的 MP4"}
                        </span>
                        <a
                          href={activeJob.outputVideoUrl}
                          download={`teleport-${activeJob.id}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[32px] items-center rounded-full bg-lime px-3.5 text-xs font-bold text-accent-ink"
                        >
                          {isEn ? "Download MP4" : "下載 MP4"}
                        </a>
                      </div>
                    </div>
                  ) : activeJob.status === "failed" ? (
                    <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                      {activeJob.error || (isEn ? "Generation failed." : "生成失敗，請重試")}
                    </div>
                  ) : (
                    <div className="mt-3 grid min-h-[11rem] place-items-center rounded-xl border border-accent-ink/12 bg-white/80 p-4 text-center">
                      <div className="max-w-xs space-y-2">
                        <Spinner className="mx-auto h-6 w-6 text-accent-ink" />
                        <p className="font-display text-xs font-bold text-foreground">
                          {isEn ? "Relocating in background…" : "正在背景執行換場…"}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeJob.status === "failed" && activeJob.outputVideoUrl && activeJob.error ? (
                    <div className="mt-2.5 rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-600">
                      {activeJob.error}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* Scrollable History List */}
            <aside
              className={
                isSidebar
                  ? "order-2 flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1"
                  : "order-1 flex flex-col gap-2.5 lg:max-h-[65dvh] lg:overflow-y-auto lg:pr-1"
              }
            >
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
                        : "border-accent-ink/12 bg-paper/50 hover:border-accent-ink/35"
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
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
          </div>
        )}
      </div>
    </div>
  );
}
