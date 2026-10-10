"use client";

import { useState } from "react";
import { VideoGridCard } from "@/presentation/components/app/projects/[id]/video-grid-card";
import { VideoListFilters } from "@/presentation/components/app/projects/[id]/video-list-filters";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoTablePager } from "@/presentation/components/app/projects/[id]/video-table-pager";
import { pageCount, pageSlice } from "@/util/video-page";
import type { PublicVideoCard } from "@/presentation/serialize";
import { VIDEO_LIST_FILTERS, videoListStage, type VideoListFilter } from "@/service/video/list-stage";

function stageOf(video: PublicVideoCard, postedAt?: string) {
  return videoListStage({
    status: video.status,
    tags: video.tags,
    postedAt: postedAt || video.postedAt,
  });
}

// Folder video list: tag filters, then a paged grid.
export function VideoTable({
  folderId,
  videos,
}: {
  folderId: string;
  videos: PublicVideoCard[];
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<VideoListFilter | null>(null);
  // Posted clicks apply before the server refresh returns postedAt.
  const [postedIds, setPostedIds] = useState<Record<string, string>>({});

  const counts = Object.fromEntries(VIDEO_LIST_FILTERS.map((id) => [id, 0])) as Record<VideoListFilter, number>;
  for (const video of videos) counts[stageOf(video, postedIds[video.id])] += 1;

  const shown = filter ? videos.filter((video) => stageOf(video, postedIds[video.id]) === filter) : videos;
  const pages = pageCount(shown.length);
  const safePage = pages === 0 ? 1 : Math.min(page, pages);
  const rows = pageSlice(shown, safePage);

  function selectFilter(next: VideoListFilter | null) {
    setFilter(next);
    setPage(1);
  }

  return (
    <section className="space-y-4">
      {videos.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 py-10 text-center text-sm text-muted">
          {t("video.list.empty")}
        </p>
      ) : (
        <>
          <VideoListFilters counts={counts} active={filter} onChange={selectFilter} />
          {shown.length === 0 ? (
            <p className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 py-10 text-center text-sm text-muted">
              {t("video.filters.empty")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {rows.map((video) => (
                <VideoGridCard
                  key={video.id}
                  folderId={folderId}
                  video={video}
                  stage={stageOf(video, postedIds[video.id])}
                  onPosted={(id) => setPostedIds((current) => ({ ...current, [id]: new Date().toISOString() }))}
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
