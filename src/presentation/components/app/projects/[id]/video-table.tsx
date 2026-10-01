"use client";

import { useState } from "react";
import { VideoGridCard } from "@/presentation/components/app/projects/[id]/video-grid-card";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoTablePager } from "@/presentation/components/app/projects/[id]/video-table-pager";
import { pageCount, pageSlice } from "@/util/video-page";
import type { PublicVideoCard } from "@/presentation/serialize";

// Folder video list: paged grid of generated videos.
export function VideoTable({
  videos,
  onSelect,
  onPrefetch,
}: {
  videos: PublicVideoCard[];
  onSelect: (id: string) => void;
  // Warm the full document while the pointer rests on a card.
  onPrefetch?: (id: string) => void;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const pages = pageCount(videos.length);
  const safePage = pages === 0 ? 1 : Math.min(page, pages);
  const rows = pageSlice(videos, safePage);

  return (
    <section>
      {videos.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 py-10 text-center text-sm text-muted">
          {t("video.list.empty")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {rows.map((video) => (
              <VideoGridCard
                key={video.id}
                video={video}
                onSelect={onSelect}
                onPrefetch={onPrefetch}
              />
            ))}
          </div>
          <VideoTablePager page={safePage} pages={pages} onPage={setPage} />
        </>
      )}
    </section>
  );
}
