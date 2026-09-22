"use client";

import { VideoListItem } from "@/presentation/components/app/projects/[id]/video-list-item";
import type { PublicVideo } from "@/presentation/serialize";

// Left pane of the folder workspace: pick a video or start a new one.
export function VideoList({
  videos,
  selectedId,
  onSelect,
  onCreate,
}: {
  videos: PublicVideo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="relative z-20 rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-1.5 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)]">
      <div className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
        <div className="group/create relative w-20 shrink-0 md:w-full">
          <button
            type="button"
            onClick={onCreate}
            aria-label="新增影片"
            aria-current={selectedId === null ? "true" : undefined}
            className={`grid aspect-square w-full cursor-pointer place-items-center rounded-xl border border-dashed text-xs font-semibold transition ${
              selectedId === null
                ? "border-accent-ink bg-accent-ink/5 text-foreground"
                : "border-accent-ink/20 text-muted hover:border-accent-ink/40 hover:text-foreground"
            }`}
          >
            <span className="flex flex-col items-center gap-0.5">
              <span className="font-display text-lg leading-none">+</span>
              <span>新增</span>
            </span>
          </button>
          <span className="pointer-events-none invisible absolute left-[calc(100%+0.5rem)] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-lg border border-accent-ink/10 bg-paper px-2.5 py-1 text-xs font-semibold shadow-[4px_4px_0_0_rgba(18,20,28,0.08)] group-focus-within/create:visible [@media(hover:hover)]:group-hover/create:visible">
            新增影片
          </span>
        </div>

        {videos.length === 0 ? (
          <p className="flex min-w-[8rem] items-center px-2 text-[11px] leading-snug text-muted md:min-w-0 md:px-1 md:py-4 md:text-center">
            右邊表單送出後會出現在這裡。
          </p>
        ) : (
          <ul className="flex gap-1.5 md:w-full md:flex-col">
            {videos.map((video) => (
              <VideoListItem
                key={video.id}
                video={video}
                selected={video.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
