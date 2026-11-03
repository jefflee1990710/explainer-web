"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useState } from "react";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";

/** Modal dialog to browse, preview, download, and delete Scro Swap job history. */
export function ScroSwapHistoryDialog({
  open,
  onClose,
  jobs,
  characters,
  activeJobId,
  onSelectJob,
  onDeleteJob,
}: {
  open: boolean;
  onClose: () => void;
  jobs: PublicJutsuJob[];
  characters: PublicCharacter[];
  activeJobId: string | null;
  onSelectJob: (job: PublicJutsuJob) => void;
  onDeleteJob: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [characterFilter, setCharacterFilter] = useState<string>("all");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredJobs = useMemo(() => {
    if (characterFilter === "all") return jobs;
    if (characterFilter === "__custom__") {
      return jobs.filter((j) => !j.characterId && !j.characterName);
    }
    return jobs.filter(
      (j) =>
        j.characterId === characterFilter ||
        j.characterName === characterFilter,
    );
  }, [characterFilter, jobs]);

  const filterCharacterOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const c of characters) {
      byKey.set(c.id, c.name);
    }
    for (const j of jobs) {
      if (j.characterId && j.characterName && !byKey.has(j.characterId)) {
        byKey.set(j.characterId, j.characterName);
      } else if (!j.characterId && j.characterName) {
        byKey.set(j.characterName, j.characterName);
      }
    }
    return Array.from(byKey.entries()).map(([id, name]) => ({ id, name }));
  }, [characters, jobs]);

  const activeJob = useMemo(() => {
    if (filteredJobs.length === 0) return null;
    if (activeJobId) {
      const found = filteredJobs.find((j) => j.id === activeJobId);
      if (found) return found;
    }
    return filteredJobs[0] ?? null;
  }, [activeJobId, filteredJobs]);

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
                ? "Scro Swap History"
                : "Scro Swap 歷史紀錄 · History"}
            </h2>
            <select
              aria-label={isEn ? "Filter by character" : "按角色篩選"}
              value={characterFilter}
              onChange={(ev) => setCharacterFilter(ev.target.value)}
              className="h-8 max-w-[12rem] cursor-pointer truncate rounded-full border border-accent-ink/15 bg-white px-3 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="all">
                {isEn ? "All characters" : "全部角色"}
              </option>
              {filterCharacterOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
              {jobs.some((j) => !j.characterId && !j.characterName) ? (
                <option value="__custom__">
                  {isEn ? "Custom photo" : "自訂相片"}
                </option>
              ) : null}
            </select>
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
          {filteredJobs.length === 0 ? (
            <div className="grid min-h-[18rem] place-items-center rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-8 text-center">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">
                  {jobs.length === 0
                    ? isEn
                      ? "No swap history yet"
                      : "尚無 Scro Swap 紀錄"
                    : isEn
                      ? "No swaps for this character"
                      : "此角色尚無 Swap 紀錄"}
                </p>
                <p className="text-xs text-muted">
                  {isEn
                    ? "Submit a new Scro Swap on the main page to see your generated results here."
                    : "在主頁面建立新的 Scro Swap 任務後，即可在此查看與下載成片。"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr] xl:grid-cols-[22rem_1fr]">
              {/* Left Column: History List */}
              <aside className="flex flex-col gap-2.5 lg:max-h-[65dvh] lg:overflow-y-auto lg:pr-1">
                {filteredJobs.map((job) => {
                  const selected = activeJob?.id === job.id;
                  const thumb =
                    job.preparedStartFrameUrl ||
                    job.rawStartFrameUrl ||
                    job.referenceImageUrl;
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
                          {job.characterName ||
                            (isEn ? "Character Motion Swap" : "角色動作遷移")}
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
                              : job.status === "failed"
                                ? isEn
                                  ? "✕ Failed"
                                  : "✕ 失敗"
                                : isEn
                                  ? "Prepared"
                                  : "已準備"}
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
                          Character Motion Swap
                          {activeJob.characterName ? ` · ${activeJob.characterName}` : ""}
                        </span>
                        <h3 className="mt-1 font-display text-lg font-bold">
                          {activeJob.status === "completed"
                            ? isEn
                              ? "Swap Result Ready"
                              : "Scro Swap 成片已完成"
                            : activeJob.status === "failed"
                              ? isEn
                                ? "Swap Failed"
                                : "Scro Swap 失敗"
                              : isEn
                                ? "Running in Background…"
                                : "背景生成中（可離開此視窗，完成後自動更新）…"}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-muted">
                        {activeJob.sectionLength}s · {activeJob.aspectRatio}
                      </span>
                    </div>

                    {activeJob.status === "completed" && activeJob.outputVideoUrl ? (
                      <div className="mt-4 space-y-3 rounded-2xl border border-accent-ink/15 bg-zinc-950 p-4 text-white">
                        <video
                          key={activeJob.outputVideoUrl}
                          src={activeJob.outputVideoUrl}
                          controls
                          autoPlay
                          playsInline
                          className="max-h-[28rem] w-full rounded-xl object-contain"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-white/75">
                            {isEn
                              ? "Swapped MP4 with synchronized audio"
                              : "已完成角色動作遷移並同步原片音軌"}
                          </span>
                          <a
                            href={activeJob.outputVideoUrl}
                            download={`scro-swap-${activeJob.id}.mp4`}
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
                      <div className="mt-4 grid min-h-[18rem] place-items-center rounded-2xl border border-accent-ink/12 bg-paper/70 p-6 text-center">
                        <div className="max-w-md space-y-3">
                          <Spinner className="mx-auto h-7 w-7 text-accent-ink" />
                          <p className="font-display text-sm font-bold text-foreground">
                            {activeJob.preparedStartFrameUrl
                              ? isEn
                                ? "Keyframes & motion ready — rendering final video…"
                                : "已完成角色畫格與動作追蹤，正在渲染最終影片…"
                              : isEn
                                ? "Preparing character frame & tracking motion in background…"
                                : "正在背景準備角色畫格與追蹤原片動作…"}
                          </p>
                          <p className="text-xs text-muted">
                            {isEn
                              ? "This task is also tracked in the top background task bar. You can close this dialog and come back when it finishes."
                              : "此任務已加入頂部背景任務列，你可以關閉此視窗繼續建立其他任務，完成後會自動顯示成片。"}
                          </p>
                        </div>
                      </div>
                    )}
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
