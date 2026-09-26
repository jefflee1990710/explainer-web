"use client";

import { useState } from "react";
import { VideoTablePager } from "@/presentation/components/app/projects/[id]/video-table-pager";
import { VideoTableRow } from "@/presentation/components/app/projects/[id]/video-table-row";
import { pageCount, pageSlice } from "@/util/video-page";
import type { PublicVideo } from "@/presentation/serialize";

// Folder video list: paged table of generated videos.
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
    <section className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-4 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)] sm:p-6">
      {videos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          還沒有影片。按右上角「新增影片」開始。
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">預覽</th>
                  <th className="pb-2 pr-3 font-semibold">標題</th>
                  <th className="pb-2 pr-3 font-semibold">狀態</th>
                  <th className="pb-2 pr-3 font-semibold">比例</th>
                  <th className="pb-2 pr-3 font-semibold">時長</th>
                  <th className="pb-2 pr-3 font-semibold">語言</th>
                  <th className="pb-2 font-semibold">建立時間</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((video) => (
                  <VideoTableRow key={video.id} video={video} onSelect={onSelect} />
                ))}
              </tbody>
            </table>
          </div>
          <VideoTablePager page={safePage} pages={pages} onPage={setPage} />
        </>
      )}
    </section>
  );
}
