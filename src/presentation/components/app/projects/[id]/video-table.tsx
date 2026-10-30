"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { loadFolderVideoCardsAction } from "@/presentation/actions/projects";
import { VideoGridCard } from "@/presentation/components/app/projects/[id]/video-grid-card";
import { VideoListFilters } from "@/presentation/components/app/projects/[id]/video-list-filters";
import { VideoListLoading } from "@/presentation/components/app/projects/[id]/video-list-loading";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoTablePager } from "@/presentation/components/app/projects/[id]/video-table-pager";
import { pageCount, pageSlice } from "@/util/video-page";
import type { PublicVideoCard } from "@/presentation/serialize";
import {
  VIDEO_LIST_FILTER_PARAM,
  VIDEO_LIST_FILTERS,
  resolvedArchivedAt,
  videoListFiltersFromSearch,
  videoListFiltersSearchValue,
  videoListStage,
  type VideoListFilter,
} from "@/service/video/list-stage";

function stageOf(video: PublicVideoCard, postedAt?: string, archivedOverride?: string | null) {
  return videoListStage({
    status: video.status,
    tags: video.tags,
    postedAt: postedAt || video.postedAt,
    archivedAt: resolvedArchivedAt(video.archivedAt, archivedOverride),
  });
}

// Folder video list: tag filters, then a paged grid.
export function VideoTable({
  folderId,
  videos,
}: {
  folderId?: string;
  videos: PublicVideoCard[];
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get(VIDEO_LIST_FILTER_PARAM);
  const [page, setPage] = useState(1);
  // Posted and archive clicks apply before the server refresh returns the flags.
  const [postedIds, setPostedIds] = useState<Record<string, string>>({});
  // null means the user just unarchived, so a stale server archivedAt must not win.
  const [archivedIds, setArchivedIds] = useState<Record<string, string | null>>({});
  // Filters and the grid paint from local state before the server round trip.
  const [filters, setFilters] = useState<VideoListFilter[]>(() => videoListFiltersFromSearch(filterQuery));
  const [records, setRecords] = useState(videos);
  const [serverFilter, setServerFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const wantedFilter = useRef(filterQuery);
  const searchRef = useRef(searchParams.toString());
  const requestId = useRef(0);
  searchRef.current = searchParams.toString();

  const counts = Object.fromEntries(VIDEO_LIST_FILTERS.map((id) => [id, 0])) as Record<VideoListFilter, number>;
  for (const video of records) {
    counts[stageOf(video, postedIds[video.id], archivedIds[video.id])] += 1;
  }

  const shown = records.filter((video) =>
    filters.includes(stageOf(video, postedIds[video.id], archivedIds[video.id])),
  );
  const pages = pageCount(shown.length);
  const safePage = pages === 0 ? 1 : Math.min(page, pages);
  const rows = pageSlice(shown, safePage);

  // Polls and the first server render keep the grid in step when a filter request is not running.
  useEffect(() => {
    setRecords(videos);
  }, [videos]);

  // Back and forward keep the chips in step with the URL. A click already wrote wantedFilter.
  useEffect(() => {
    if (filterQuery === wantedFilter.current) return;
    wantedFilter.current = filterQuery;
    const next = videoListFiltersFromSearch(filterQuery);
    setFilters(next);
    setPage(1);
    setServerFilter(videoListFiltersSearchValue(next));
  }, [filterQuery]);

  // The new page has already painted. Show loading, then ask the server for records.
  useEffect(() => {
    if (serverFilter === null) return;
    setLoading(true);
  }, [serverFilter]);

  useEffect(() => {
    if (!loading || serverFilter === null || !folderId) return;
    const value = serverFilter;
    const id = ++requestId.current;
    const params = new URLSearchParams(searchRef.current);
    params.set(VIDEO_LIST_FILTER_PARAM, value);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    let active = true;
    loadFolderVideoCardsAction(folderId)
      .then((next) => {
        if (!active || requestId.current !== id) return;
        if (next) setRecords(next);
        setLoading(false);
        setServerFilter(null);
      })
      .catch(() => {
        if (!active || requestId.current !== id) return;
        setLoading(false);
        setServerFilter(null);
      });
    return () => {
      active = false;
    };
  }, [loading, serverFilter, folderId, pathname]);

  function selectFilters(next: VideoListFilter[]) {
    const value = videoListFiltersSearchValue(next);
    wantedFilter.current = value;
    setFilters(next);
    setPage(1);
    if (folderId) setServerFilter(value);
  }

  return (
    <section className="space-y-4">
      {records.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 py-10 text-center text-sm text-muted">
          {t("video.list.empty")}
        </p>
      ) : (
        <>
          <VideoListFilters counts={counts} active={filters} onChange={selectFilters} />
          {loading ? <VideoListLoading label={t("common.loading")} /> : null}
          {shown.length === 0 ? (
            <p className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 py-10 text-center text-sm text-muted">
              {t("video.filters.empty")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-busy={loading}>
              {rows.map((video) => (
                <VideoGridCard
                  key={video.id}
                  folderId={video.projectId || folderId || ""}
                  video={video}
                  stage={stageOf(video, postedIds[video.id], archivedIds[video.id])}
                  onPosted={(id) => setPostedIds((current) => ({ ...current, [id]: new Date().toISOString() }))}
                  onArchived={(id) =>
                    setArchivedIds((current) => ({ ...current, [id]: new Date().toISOString() }))
                  }
                  onUnarchived={(id) => setArchivedIds((current) => ({ ...current, [id]: null }))}
                />
              ))}
            </div>
          )}
          <VideoTablePager page={safePage} pages={pages} onPage={setPage} />
        </>
      )}
    </section>
  );
}
