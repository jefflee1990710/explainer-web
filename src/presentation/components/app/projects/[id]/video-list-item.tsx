"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { productionCounts } from "@/service/clip-stage";
import { projectStatusLabel } from "@/util/project-status-i18n";
import { STATUS_META } from "@/service/project-status";
import { videoPreviewUrl, type PublicVideo } from "@/presentation/serialize";

// Compact square in the rail; hover/focus reveals a full-width preview + title.
export function VideoListItem({
  video,
  selected,
  onSelect,
}: {
  video: PublicVideo;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const preview = videoPreviewUrl(video);
  const title = video.phaseA?.localizedTitle || "未命名影片";
  const label = projectStatusLabel(video.status, t);
  const aria = `${title}，${label}`;

  return (
    <li className="group relative z-0 w-20 shrink-0 hover:z-30 focus-within:z-30 md:w-full">
      <button
        type="button"
        onClick={() => onSelect(video.id)}
        aria-current={selected ? "true" : undefined}
        aria-label={aria}
        className={`relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl border bg-accent-ink/5 transition ${
          selected
            ? "border-accent-ink outline outline-2 outline-offset-2 outline-accent-ink"
            : "border-accent-ink/10 hover:-translate-y-0.5"
        }`}
      >
        <PreviewImage src={preview} title={title} />
        <StatusOverlay video={video} compact />
      </button>

      {/* Touch: title under the square so the name is visible without hover. */}
      <p className="mt-1 line-clamp-2 px-0.5 text-[11px] font-semibold leading-snug md:hidden">
        {title}
      </p>

      {/* Pointer: full-width 16:9 preview + name, overlapping the workspace. */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 z-20 hidden w-[15.5rem] rounded-[1.25rem] border border-accent-ink/10 bg-paper/95 opacity-0 shadow-[6px_6px_0_0_rgba(18,20,28,0.12)] transition duration-200 group-focus-within:visible group-focus-within:opacity-100 md:block [@media(hover:hover)]:group-hover:visible [@media(hover:hover)]:group-hover:opacity-100"
      >
        <div className="relative aspect-video overflow-hidden rounded-t-[1.2rem] bg-accent-ink/5">
          <PreviewImage src={preview} title={title} />
          <StatusOverlay video={video} compact={false} />
        </div>
        <p className="px-3 py-2.5 font-display text-sm font-bold leading-snug">{title}</p>
      </div>
    </li>
  );
}

function PreviewImage({ src, title }: { src: string | null; title: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  return (
    <span
      aria-hidden
      className="absolute inset-0 grid place-items-center border border-dashed border-accent-ink/15"
    >
      <span className="h-6 w-6 rounded-md border border-accent-ink/25" />
      <span className="sr-only">{title}</span>
    </span>
  );
}

// Status + clip progress on top of the preview; compact fits the square rail.
function StatusOverlay({ video, compact }: { video: PublicVideo; compact: boolean }) {
  const { t } = useI18n();
  const label = projectStatusLabel(video.status, t);
  const meta = STATUS_META[video.status];
  const counts =
    video.status === "production" || video.status === "ready"
      ? productionCounts(video)
      : null;
  const detail =
    counts && counts.total > 0
      ? compact
        ? `影片 ${counts.videosDone}/${counts.total}`
        : `影片 ${counts.videosDone}/${counts.total} · 畫格 ${counts.framesDone}/${counts.total}`
      : video.status === "failed" && video.error
        ? video.error
        : null;

  return (
    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-accent-ink/80 via-accent-ink/40 to-transparent px-1.5 pb-1.5 pt-6">
      <span className="flex items-center gap-1 font-display text-[10px] font-bold leading-tight text-paper">
        {meta.busy ? <Spinner className="h-2.5 w-2.5" /> : null}
        {label}
      </span>
      {detail ? (
        <span className="mt-0.5 block text-[9px] font-semibold leading-tight text-paper/85">
          {detail}
        </span>
      ) : null}
    </span>
  );
}
