"use client";

import { useState } from "react";
import { VideoGridCard } from "@/presentation/components/app/projects/[id]/video-grid-card";
import { VideoTablePager } from "@/presentation/components/app/projects/[id]/video-table-pager";
import { pageCount, pageSlice } from "@/util/video-page";
import type { PublicVideo } from "@/presentation/serialize";

// Folder video list: paged grid of generated videos.
export function VideoTable({
  videos,
  onSelect,
}: {
  videos: PublicVideo[];
  onSelect: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const pages = pageCount(videos.length);
  const safePage = pages === 0 ? 1 : Math.min(page, pages);
  const rows = pageSlice(videos, safePage);

  return (
    <section>
      {videos.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 py-10 text-center text-sm text-muted">
          還沒有影片。按右上角「新增影片」開始。
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((video) => (
              <VideoGridCard key={video.id} video={video} onSelect={onSelect} />
            ))}
          </div>
          <VideoTablePager page={safePage} pages={pages} onPage={setPage} />
        </>
      )}
    </section>
  );
}
