"use client";

import { StatusBadge } from "@/components/project/status-badge";
import { videoPreviewUrl, type PublicVideo } from "@/lib/serialize";

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
    <div className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-3 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)]">
      <button
        type="button"
        onClick={onCreate}
        className={`flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border border-dashed px-3 text-sm font-semibold transition ${
          selectedId === null
            ? "border-accent-ink bg-accent-ink/5 text-foreground"
            : "border-accent-ink/20 text-muted hover:border-accent-ink/40 hover:text-foreground"
        }`}
      >
        新增影片
      </button>

      {videos.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-muted">
          還沒有影片。右邊表單送出後會出現在這裡。
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {videos.map((video) => {
            const selected = video.id === selectedId;
            const preview = videoPreviewUrl(video);
            const title = video.phaseA?.localizedTitle || "未命名影片";
            return (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() => onSelect(video.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                    selected ? "bg-accent-ink/5" : "hover:bg-accent-ink/5"
                  }`}
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt=""
                      width={72}
                      height={40}
                      className="h-10 w-[72px] shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid h-10 w-[72px] shrink-0 place-items-center rounded-md border border-dashed border-accent-ink/20 bg-accent-ink/5"
                    >
                      <span className="h-4 w-7 rounded-sm border border-accent-ink/25" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{title}</span>
                    <StatusBadge status={video.status} className="mt-1" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
