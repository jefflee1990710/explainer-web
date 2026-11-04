"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import { openJutsuJobInEditorAction } from "@/presentation/actions/jutsu";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { folderVideoPath } from "@/service/folder-video-path";

/**
 * Reusable Scro Swap history & active-result panel.
 * Rendered directly as a sticky right-hand column on desktop (`lg+`) and inside `ScroSwapHistoryDialog` on mobile.
 */
export function ScroSwapHistoryPanel({
  jobs,
  characters,
  activeJobId,
  onSelectJob,
  onDeleteJob,
  layout = "sidebar",
}: {
  jobs: PublicJutsuJob[];
  characters: PublicCharacter[];
  activeJobId: string | null;
  onSelectJob: (job: PublicJutsuJob) => void;
  onDeleteJob: (id: string) => void;
  layout?: "sidebar" | "modal";
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const isEn = locale === "en";
  const [characterFilter, setCharacterFilter] = useState<string>("all");
  const [openingJobId, setOpeningJobId] = useState<string | null>(null);

  async function openInEditor(job: PublicJutsuJob) {
    if (job.sourceMediaKind === "image" || job.outputImageUrl) return;
    if (openingJobId) return;
    if (job.targetVideoId) {
      router.push(folderVideoPath(undefined, job.targetVideoId));
      return;
    }
    setOpeningJobId(job.id);
    try {
      const res = await openJutsuJobInEditorAction(job.id);
      if (res.ok) {
        router.push(folderVideoPath(undefined, res.videoId));
      }
    } finally {
      setOpeningJobId(null);
    }
  }

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

  const isSidebar = layout === "sidebar";

  return (
    <div
      className={
        isSidebar
          ? "flex flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[4px_4px_0_0_#12141c]"
          : "space-y-4"
      }
    >
      {/* Header with Character Filter */}
      <div
        className={
          isSidebar
            ? "flex flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 bg-paper/85 px-4 py-3.5"
            : "flex flex-wrap items-center justify-between gap-2"
        }
      >
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-bold text-foreground">
            {isEn ? "Swap History" : "歷史紀錄 History"}
          </h2>
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent-ink/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted">
            {jobs.length}
          </span>
        </div>

        <select
          aria-label={isEn ? "Filter by character" : "按角色篩選"}
          value={characterFilter}
          onChange={(ev) => setCharacterFilter(ev.target.value)}
          className="h-8 max-w-[11rem] cursor-pointer truncate rounded-full border border-accent-ink/15 bg-white px-3 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <option value="all">{isEn ? "All characters" : "全部角色"}</option>
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

      {/* Body */}
      <div className={isSidebar ? "space-y-4 p-4" : ""}>
        {filteredJobs.length === 0 ? (
          <div className="grid min-h-[14rem] place-items-center rounded-2xl border border-dashed border-accent-ink/20 bg-paper/60 p-6 text-center">
            <div className="space-y-1.5">
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
                  ? "Submit a new Scro Swap on the left to see your generated results here."
                  : "建立新的 Scro Swap 任務後，即可在此即時查看進度與下載成片。"}
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
                        {activeJob.characterName || "Scro Swap"}
                      </span>
                      <h3 className="mt-1 truncate font-display text-sm font-bold">
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
                              : "背景生成中…"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeJob.sourceMediaKind !== "image" && !activeJob.outputImageUrl ? (
                        <button
                          type="button"
                          disabled={openingJobId === activeJob.id}
                          onClick={() => void openInEditor(activeJob)}
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full bg-accent-ink px-3 text-[11px] font-bold text-lime transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {openingJobId === activeJob.id ? (
                            <Spinner className="h-3 w-3 text-lime" />
                          ) : null}
                          <span>{isEn ? "Open in OpenCut" : "在剪輯器開啟"}</span>
                        </button>
                      ) : null}
                      <span className="text-[11px] font-semibold text-muted">
                        {activeJob.sourceMediaKind === "image" || activeJob.outputImageUrl
                          ? `2K Image · ${activeJob.aspectRatio}`
                          : `${activeJob.sectionLength}s · ${activeJob.aspectRatio}`}
                      </span>
                    </div>
                  </div>

                  {activeJob.status === "completed" && activeJob.outputImageUrl ? (
                    <div className="mt-3 space-y-2.5 rounded-xl border border-accent-ink/15 bg-zinc-950 p-3 text-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={activeJob.outputImageUrl}
                        src={activeJob.outputImageUrl}
                        alt=""
                        className="max-h-80 w-full rounded-lg object-contain"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-white/75">
                          {isEn ? "Swapped 2K image" : "已完成 2K 角色換角圖片"}
                        </span>
                        <a
                          href={activeJob.outputImageUrl}
                          download={`scro-swap-${activeJob.id}.webp`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[32px] items-center rounded-full bg-lime px-3.5 text-xs font-bold text-accent-ink"
                        >
                          {isEn ? "Download Image" : "下載換角圖片"}
                        </a>
                      </div>
                    </div>
                  ) : activeJob.status === "completed" && activeJob.outputVideoUrl ? (
                    <div className="mt-3 space-y-2.5 rounded-xl border border-accent-ink/15 bg-zinc-950 p-3 text-white">
                      {activeJob.outputGifUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={activeJob.outputGifUrl}
                          src={activeJob.outputGifUrl}
                          alt=""
                          className="max-h-80 w-full rounded-lg object-contain"
                        />
                      ) : (
                        <video
                          key={activeJob.outputVideoUrl}
                          src={activeJob.outputVideoUrl}
                          controls
                          autoPlay
                          playsInline
                          className="max-h-80 w-full rounded-lg object-contain"
                        />
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-white/75">
                          {activeJob.outputGifUrl
                            ? isEn
                              ? "Looping GIF & MP4 ready"
                              : "已完成循環 GIF 與 MP4"
                            : isEn
                              ? "Swapped MP4"
                              : "已完成角色動作遷移 MP4"}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activeJob.outputGifUrl ? (
                            <a
                              href={activeJob.outputGifUrl}
                              download={`scro-swap-${activeJob.id}.gif`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-[32px] items-center rounded-full bg-lime px-3.5 text-xs font-bold text-accent-ink"
                            >
                              {isEn ? "Download GIF" : "下載 GIF"}
                            </a>
                          ) : null}
                          <a
                            href={activeJob.outputVideoUrl}
                            download={`scro-swap-${activeJob.id}.mp4`}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex min-h-[32px] items-center rounded-full px-3.5 text-xs font-bold ${
                              activeJob.outputGifUrl
                                ? "border border-white/25 bg-white/10 text-white hover:bg-white/20"
                                : "bg-lime text-accent-ink"
                            }`}
                          >
                            {isEn ? "Download MP4" : "下載 MP4"}
                          </a>
                        </div>
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
                          {activeJob.preparedStartFrameUrl
                            ? isEn
                              ? "Keyframes & motion ready — rendering final video…"
                              : "已完成角色畫格與動作追蹤，正在渲染最終影片…"
                            : isEn
                              ? "Preparing character frame & tracking motion in background…"
                              : "正在背景準備角色畫格與追蹤原片動作…"}
                        </p>
                      </div>
                    </div>
                  )}
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
              {filteredJobs.map((job) => {
                const selected = activeJob?.id === job.id;
                const thumb =
                  job.outputImageUrl ||
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
                        {job.characterName ||
                          (isEn ? "Character Motion Swap" : "角色動作遷移")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {job.status === "completed"
                          ? isEn
                            ? "✓ Completed"
                            : job.sourceMediaKind === "image" || job.outputImageUrl
                              ? "✓ 已完成圖片"
                              : job.sourceMediaKind === "gif" || job.outputGifUrl
                                ? "✓ 已完成 GIF"
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
                        {job.sourceMediaKind === "image" || job.outputImageUrl
                          ? " · 2K Image"
                          : ` · ${job.sectionLength}s`}
                      </p>
                    </div>
                    {job.sourceMediaKind !== "image" && !job.outputImageUrl ? (
                      <button
                        type="button"
                        disabled={openingJobId === job.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void openInEditor(job);
                        }}
                        className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-accent-ink/20 bg-white px-2.5 text-[11px] font-bold text-accent-ink transition hover:border-accent-ink hover:bg-lime/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {openingJobId === job.id ? (
                          <Spinner className="h-3 w-3 text-accent-ink" />
                        ) : null}
                        <span>{isEn ? "Open in OpenCut" : "在剪輯器開啟"}</span>
                      </button>
                    ) : null}
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
