"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import {
  deleteJutsuJobAction,
  pollJutsuJobStatusAction,
} from "@/presentation/actions/jutsu";
import { ScroSwapCreateDialog } from "@/presentation/components/app/jutsu/scro-swap-create-dialog";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";

export function JutsuStudio({
  characters: initialCharacters,
  initialJobs,
}: {
  characters: PublicCharacter[];
  customWardrobeItems?: PublicCustomWardrobeItem[];
  initialJobs: PublicJutsuJob[];
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [characters, setCharacters] = useState<PublicCharacter[]>(initialCharacters);
  const [jobs, setJobs] = useState<PublicJutsuJob[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<PublicJutsuJob | null>(
    initialJobs[0] ?? null,
  );
  const [createOpen, setCreateOpen] = useState(initialJobs.length === 0);

  const handleCharacterUpdated = useCallback((next: PublicCharacter) => {
    setCharacters((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  }, []);

  // Poll any in-flight job automatically and keep the right result panel updated.
  useEffect(() => {
    const runningIds = jobs
      .filter((item) => item.status === "rendering")
      .map((item) => item.id);
    if (runningIds.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const id of runningIds) {
        const res = await pollJutsuJobStatusAction(id);
        if (!res.ok) continue;
        setJobs((prev) =>
          prev.map((item) => (item.id === res.job.id ? res.job : item)),
        );
        setActiveJob((prev) => (prev?.id === res.job.id ? res.job : prev));
        if (res.job.status === "completed" || res.job.status === "failed") {
          notifyTasksChanged();
        }
      }
    }, 4500);

    return () => window.clearInterval(timer);
  }, [jobs]);

  async function onDeleteJob(id: string) {
    const res = await deleteJutsuJobAction(id);
    if (res.ok) {
      const remaining = jobs.filter((j) => j.id !== id);
      setJobs(remaining);
      if (activeJob?.id === id) {
        setActiveJob(remaining[0] ?? null);
      }
      notifyTasksChanged();
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-6 pb-12">
      {/* Header with Top-Right Add Button */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/10 bg-paper/90 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
              Scro Swap
            </span>
            <h1 className="font-display text-xl font-bold">
              {isEn ? "Character Motion Swap" : "Scro Swap 角色動作遷移"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted">
            {isEn
              ? "Browse your swap history on the left, inspect or download the result on the right, or click + Add to start a new swap."
              : "左側瀏覽歷史紀錄，右側即時播放與下載成片；點擊右上角「+ 新增」開啟建立視窗。"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 text-sm font-bold text-lime shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span>+</span>
          <span>{isEn ? "New Swap" : "新增 Swap"}</span>
        </button>
      </header>

      {/* Main 2-Column Workspace: Left History | Right Result */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr] xl:grid-cols-[24rem_1fr]">
        {/* Left Column: Swap History */}
        <aside className="flex flex-col rounded-2xl border border-accent-ink/12 bg-paper/90 p-4">
          <div className="flex items-center justify-between gap-2 pb-3">
            <h2 className="font-display text-sm font-bold">
              {isEn ? `History (${jobs.length})` : `歷史紀錄（${jobs.length}）`}
            </h2>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="cursor-pointer text-xs font-bold text-accent hover:underline"
            >
              {isEn ? "+ Add" : "+ 新增"}
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="grid min-h-[16rem] place-items-center rounded-xl border border-dashed border-accent-ink/15 p-6 text-center">
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground">
                  {isEn ? "No swap history yet" : "尚無 Scro Swap 紀錄"}
                </p>
                <p className="text-[11px] text-muted">
                  {isEn
                    ? "Click + New Swap at top right to upload a video and pick a character."
                    : "按右上角「+ 新增 Swap」上傳短片並揀選角色。"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex max-h-[38rem] flex-col gap-2.5 overflow-y-auto pr-0.5">
              {jobs.map((job) => {
                const selected = activeJob?.id === job.id;
                const thumb =
                  job.preparedStartFrameUrl ||
                  job.rawStartFrameUrl ||
                  job.referenceImageUrl;
                return (
                  <div
                    key={job.id}
                    onClick={() => setActiveJob(job)}
                    className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${
                      selected
                        ? "border-2 border-accent-ink bg-white shadow-xs"
                        : "border-accent-ink/12 bg-paper hover:border-accent-ink/35"
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
                        void onDeleteJob(job.id);
                      }}
                      aria-label={isEn ? "Delete job" : "刪除紀錄"}
                      className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-xs text-muted hover:bg-red-50 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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
                  <h2 className="mt-1 font-display text-lg font-bold">
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
                          : "背景生成中（可離開此頁，完成後自動更新）…"}
                  </h2>
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
                    loop
                    playsInline
                    className="max-h-[32rem] w-full rounded-xl object-contain"
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
                <div className="mt-4 grid min-h-[22rem] place-items-center rounded-2xl border border-accent-ink/12 bg-paper/70 p-6 text-center">
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
                        ? "This task is also tracked in the top background task bar. You can keep working and come back when it finishes."
                        : "此任務已加入頂部背景任務列，你可以自由切換頁面，完成後會自動顯示成片。"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid min-h-[24rem] place-items-center rounded-2xl border border-dashed border-accent-ink/20 bg-paper/60 p-8 text-center">
              <div className="max-w-md space-y-3">
                <p className="font-display text-base font-bold text-foreground">
                  {isEn ? "Ready to run Scro Swap" : "準備好開始 Scro Swap"}
                </p>
                <p className="text-xs leading-relaxed text-muted">
                  {isEn
                    ? "Click + New Swap to upload a reference video and choose a character preset, historical look, or customized outfit."
                    : "點擊「+ 新增 Swap」上傳參考短片，並揀選角色預設造型、歷史造型或自訂穿搭。"}
                </p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 text-xs font-bold text-lime"
                >
                  {isEn ? "+ New Swap" : "+ 新增 Swap"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {createOpen ? (
        <ScroSwapCreateDialog
          characters={characters}
          onCharacterUpdated={handleCharacterUpdated}
          onCreated={(job) => {
            setActiveJob(job);
            setJobs((prev) => [
              job,
              ...prev.filter((item) => item.id !== job.id),
            ]);
            setCreateOpen(false);
            notifyTasksChanged();
          }}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
}
