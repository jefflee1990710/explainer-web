"use client";

import { useState } from "react";
import { PreviewStrip } from "@/presentation/components/app/preview-strip";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideoCard } from "@/presentation/serialize";
import type { StudioClipItem } from "@/presentation/studio/clip-item";
import { Filmstrip } from "@/presentation/studio/filmstrip";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { durationPresetLabel, voLanguageLabel } from "@/util/i18n/picker-labels";

// Card data already on the list. Shown while the full video document is still in flight.
export function VideoEditorShell({ video }: { video: PublicVideoCard }) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState("1");
  const clipCount = video.videosTotal;
  const duration = durationPresetLabel(t, video.durationPreset).label;
  const language = voLanguageLabel(t, video.language).label;
  const meta = [video.aspectRatio, duration, language].filter(Boolean).join(" · ");

  const items: StudioClipItem[] = Array.from({ length: clipCount }, (_, index) => {
    const n = index + 1;
    return {
      id: String(n),
      title: t("production.filmstrip.clipTitle", { n }),
      durationLabel: "",
      statusLabel: t("video.workspace.loading"),
      busy: false,
      stale: false,
      tone: "idle",
      hasScene: false,
      hasVideo: false,
    };
  });

  const inspector = (
    <div className="space-y-4 p-4">
      <p className="inline-flex items-center gap-2 text-sm text-[var(--studio-muted)]">
        <Spinner className="h-3.5 w-3.5" />
        {t("video.workspace.loading")}
      </p>
      {clipCount > 0 ? (
        <p className="text-sm font-semibold">
          {t("video.card.progress", { done: video.videosDone, total: clipCount })}
        </p>
      ) : null}
      <div>
        <p className="text-xs font-semibold text-[var(--studio-muted)]">{t("brief.source.label")}</p>
        <p className="mt-1 line-clamp-8 whitespace-pre-wrap text-sm leading-6">
          {video.source || t("video.card.unnamed")}
        </p>
      </div>
      {meta ? <p className="text-xs text-[var(--studio-muted)]">{meta}</p> : null}
      {video.error ? <p className="text-sm text-accent">{video.error}</p> : null}
      {/* Scene, motion, and frames are not on the list card. */}
      <div className="space-y-2" aria-hidden>
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--studio-fill)]" />
        <div className="h-20 animate-pulse rounded-xl bg-[var(--studio-fill)]" />
        <div className="h-20 animate-pulse rounded-xl bg-[var(--studio-fill)]" />
      </div>
    </div>
  );

  const preview = (
    <div className="grid min-h-[16rem] flex-1 place-items-center p-6">
      {video.previewUrls.length ? (
        <div className="h-72 max-w-full overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-white">
          <PreviewStrip urls={video.previewUrls} alt={video.title} />
        </div>
      ) : (
        <div className="h-48 w-32 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
      )}
    </div>
  );

  if (clipCount === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--studio-canvas)]">
        <div className="mx-auto w-full max-w-3xl">{inspector}</div>
      </div>
    );
  }

  return (
    <StudioFrame
      inspector={inspector}
      preview={preview}
      timeline={<Filmstrip items={items} selectedId={selectedId} onSelect={setSelectedId} />}
    />
  );
}
