"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { productionCounts } from "@/service/clip-stage";
import { projectStatusLabel } from "@/util/project-status-i18n";
import { STATUS_META } from "@/service/project-status";
import { videoPreviewUrl, type PublicVideo } from "@/presentation/serialize";

// One generated video as a selectable table row.
export function VideoTableRow({
  video,
  onSelect,
}: {
  video: PublicVideo;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const preview = videoPreviewUrl(video);
  const title = video.phaseA?.localizedTitle || "未命名影片";
  const label = projectStatusLabel(video.status, t);
  const meta = STATUS_META[video.status];
  const counts =
    video.status === "production" || video.status === "ready"
      ? productionCounts(video)
      : null;
  const progress =
    counts && counts.total > 0
      ? `影片 ${counts.videosDone}/${counts.total}`
      : video.status === "failed" && video.error
        ? video.error
        : null;
  const created = new Date(video.createdAt).toLocaleString("zh-Hant", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function onKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(video.id);
    }
  }

  return (
    <tr
      tabIndex={0}
      onClick={() => onSelect(video.id)}
      onKeyDown={onKeyDown}
      className="cursor-pointer border-t border-accent-ink/10 transition hover:bg-accent-ink/5 focus-visible:bg-accent-ink/5 focus-visible:outline-none"
    >
      <td className="py-2.5 pr-3">
        <span className="relative block h-12 w-[4.5rem] overflow-hidden rounded-lg border border-accent-ink/10 bg-accent-ink/5">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="absolute inset-0 grid place-items-center">
              <span className="h-5 w-5 rounded-md border border-accent-ink/25" />
            </span>
          )}
        </span>
      </td>
      <td className="py-2.5 pr-3 font-display text-sm font-bold leading-snug">{title}</td>
      <td className="py-2.5 pr-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          {meta.busy ? <Spinner className="h-3.5 w-3.5" /> : null}
          {label}
        </span>
        {progress ? <span className="mt-0.5 block text-xs text-muted">{progress}</span> : null}
      </td>
      <td className="py-2.5 pr-3 text-sm text-muted">{video.aspectRatio}</td>
      <td className="py-2.5 pr-3 text-sm text-muted">
        {DURATION_PRESETS[video.durationPreset]?.label ?? video.durationPreset}
      </td>
      <td className="py-2.5 pr-3 text-sm text-muted">
        {LANGUAGE_PRESETS[video.language]?.label ?? video.language}
      </td>
      <td className="py-2.5 text-sm text-muted">{created}</td>
    </tr>
  );
}
