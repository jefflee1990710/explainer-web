"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import type { PublicTeleportJob } from "@/model/teleport-job";
import {
  deleteJutsuJobAction,
  pollJutsuJobStatusAction,
} from "@/presentation/actions/jutsu";
import {
  deleteTeleportJobAction,
  pollTeleportJobStatusAction,
} from "@/presentation/actions/teleport";
import { VideoListFilters } from "@/presentation/components/app/projects/[id]/video-list-filters";
import { VideoTablePager } from "@/presentation/components/app/projects/[id]/video-table-pager";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { VideoListRow } from "@/presentation/components/app/videos/video-list-row";
import { useI18n } from "@/presentation/components/i18n-provider";
import type {
  PublicCharacter,
  PublicVideoCard,
} from "@/presentation/serialize";
import {
  VIDEO_LIST_FILTER_PARAM,
  videoListFiltersFromSearch,
  videoListFiltersSearchValue,
  type VideoListFilter,
} from "@/service/video/list-stage";
import {
  buildUnifiedVideoItems,
  filterUnifiedVideoItems,
  type UnifiedVideoCategory,
} from "@/service/video/unified-video-list";
import { pageCount, pageSlice } from "@/util/video-page";

export function AllVideosView({
  initialVideos,
  initialSwapJobs,
  initialTeleportJobs,
}: {
  initialVideos: PublicVideoCard[];
  initialSwapJobs: PublicJutsuJob[];
  initialTeleportJobs: PublicTeleportJob[];
  characters?: PublicCharacter[];
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get(VIDEO_LIST_FILTER_PARAM);

  const [tab, setTab] = useState<UnifiedVideoCategory>("all");
  const [page, setPage] = useState(1);
  const [polledSwapById, setPolledSwapById] = useState<
    Record<string, PublicJutsuJob>
  >({});
  const [deletedSwapIds, setDeletedSwapIds] = useState<Record<string, boolean>>(
    {},
  );
  const [polledTeleportById, setPolledTeleportById] = useState<
    Record<string, PublicTeleportJob>
  >({});
  const [deletedTeleportIds, setDeletedTeleportIds] = useState<
    Record<string, boolean>
  >({});
  const [postedOverrides, setPostedOverrides] = useState<
    Record<string, string>
  >({});
  const [archivedOverrides, setArchivedOverrides] = useState<
    Record<string, string | null>
  >({});
  const [filters, setFilters] = useState<VideoListFilter[]>(() =>
    videoListFiltersFromSearch(filterQuery),
  );

  const swapJobs = useMemo(
    () =>
      initialSwapJobs
        .filter((item) => !deletedSwapIds[item.id])
        .map((item) => polledSwapById[item.id] ?? item),
    [initialSwapJobs, deletedSwapIds, polledSwapById],
  );

  const teleportJobs = useMemo(
    () =>
      initialTeleportJobs
        .filter((item) => !deletedTeleportIds[item.id])
        .map((item) => polledTeleportById[item.id] ?? item),
    [initialTeleportJobs, deletedTeleportIds, polledTeleportById],
  );

  // Poll in-flight Scro Swap jobs every 4.5s
  useEffect(() => {
    const runningIds = swapJobs
      .filter((item) => item.status === "rendering")
      .map((item) => item.id);
    if (runningIds.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const id of runningIds) {
        const res = await pollJutsuJobStatusAction(id);
        if (!res.ok) continue;
        setPolledSwapById((prev) => ({ ...prev, [res.job.id]: res.job }));
        if (res.job.status === "completed" || res.job.status === "failed") {
          notifyTasksChanged();
        }
      }
    }, 4500);

    return () => window.clearInterval(timer);
  }, [swapJobs]);

  // Poll in-flight Teleport jobs every 4.5s
  useEffect(() => {
    const runningIds = teleportJobs
      .filter((item) => item.status === "rendering")
      .map((item) => item.id);
    if (runningIds.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const id of runningIds) {
        const res = await pollTeleportJobStatusAction(id);
        if (!res.ok) continue;
        setPolledTeleportById((prev) => ({ ...prev, [res.job.id]: res.job }));
        if (res.job.status === "completed" || res.job.status === "failed") {
          notifyTasksChanged();
        }
      }
    }, 4500);

    return () => window.clearInterval(timer);
  }, [teleportJobs]);

  function selectTab(nextTab: UnifiedVideoCategory) {
    setTab(nextTab);
    setPage(1);
  }

  function selectFilters(next: VideoListFilter[]) {
    const value = videoListFiltersSearchValue(next);
    setFilters(next);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set(VIDEO_LIST_FILTER_PARAM, value);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  async function handleDeleteSwap(id: string) {
    const res = await deleteJutsuJobAction(id);
    if (res.ok) {
      setDeletedSwapIds((prev) => ({ ...prev, [id]: true }));
      notifyTasksChanged();
    }
    return res;
  }

  async function handleDeleteTeleport(id: string) {
    const res = await deleteTeleportJobAction(id);
    if (res.ok) {
      setDeletedTeleportIds((prev) => ({ ...prev, [id]: true }));
      notifyTasksChanged();
    }
    return res;
  }

  function handlePosted(itemId: string, videoId?: string) {
    const now = new Date().toISOString();
    setPostedOverrides((prev) => ({
      ...prev,
      [itemId]: now,
      ...(videoId ? { [videoId]: now } : {}),
    }));
  }

  function handleArchived(itemId: string, videoId?: string) {
    const now = new Date().toISOString();
    setArchivedOverrides((prev) => ({
      ...prev,
      [itemId]: now,
      ...(videoId ? { [videoId]: now } : {}),
    }));
  }

  function handleUnarchived(itemId: string, videoId?: string) {
    setArchivedOverrides((prev) => ({
      ...prev,
      [itemId]: null,
      ...(videoId ? { [videoId]: null } : {}),
    }));
  }

  const allItems = useMemo(
    () =>
      buildUnifiedVideoItems({
        videos: initialVideos,
        swapJobs,
        teleportJobs,
        postedOverrides,
        archivedOverrides,
        isEn,
        t,
      }),
    [
      initialVideos,
      swapJobs,
      teleportJobs,
      postedOverrides,
      archivedOverrides,
      isEn,
      t,
    ],
  );

  const { filtered, categoryCounts, stageCounts } = useMemo(
    () => filterUnifiedVideoItems(allItems, tab, filters),
    [allItems, tab, filters],
  );

  const pages = pageCount(filtered.length);
  const safePage = pages === 0 ? 1 : Math.min(page, pages);
  const rows = pageSlice(filtered, safePage);

  const tabs: Array<{
    id: UnifiedVideoCategory;
    label: string;
    count: number;
  }> = [
    {
      id: "all",
      label: isEn ? "All Videos" : "全部影片",
      count: categoryCounts.all,
    },
    {
      id: "studio",
      label: isEn ? "Explainer & Talking Head" : "解說與開講影片",
      count: categoryCounts.studio,
    },
    {
      id: "scroswap",
      label: isEn ? "Scro Swap" : "Scro Swap 換角",
      count: categoryCounts.scroswap,
    },
    {
      id: "teleport",
      label: isEn ? "Teleport" : "Teleport 換場",
      count: categoryCounts.teleport,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#12141c]">
            {isEn ? "Videos" : "影片庫 Videos"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {isEn
              ? "All generated Explainer, Talking Head, Scro Swap, and Teleport videos."
              : "集中檢視、播放與下載所有已生成的解說、開講、Scro Swap 與 Teleport 影片。"}
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Video categories"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white p-1.5"
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(item.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-[#12141c] text-[#c6f24b]"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-[#12141c]"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-2xl px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                    active
                      ? "bg-white/15 text-[#c6f24b]"
                      : "bg-zinc-200/80 text-zinc-700"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center text-sm text-zinc-500">
          {isEn ? "No generated videos yet." : "尚無已生成的影片紀錄。"}
        </div>
      ) : (
        <section className="space-y-4">
          <VideoListFilters
            counts={stageCounts}
            active={filters}
            onChange={selectFilters}
          />
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500">
              {t("video.filters.empty")}
            </p>
          ) : (
            <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {rows.map((item) => (
                <VideoListRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onPosted={handlePosted}
                  onArchived={handleArchived}
                  onUnarchived={handleUnarchived}
                  onDeleteSwap={handleDeleteSwap}
                  onDeleteTeleport={handleDeleteTeleport}
                />
              ))}
            </div>
          )}
          <VideoTablePager page={safePage} pages={pages} onPage={setPage} />
        </section>
      )}
    </div>
  );
}
