"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { LifeSceneHit } from "@/service/character/life-prompt";

// Search hits or one uploaded photo inside the center scrollable grid.
export function LifeSceneSource({
  mode,
  hits,
  selectedUrl,
  uploadUrl,
  onPick,
}: {
  mode: "search" | "upload";
  hits: LifeSceneHit[];
  selectedUrl: string;
  uploadUrl: string;
  onPick: (url: string) => void;
}) {
  const { t } = useI18n();
  const items =
    mode === "upload" && uploadUrl
      ? [{ title: t("life.upload"), thumbUrl: uploadUrl }]
      : hits;

  if (!items.length) {
    return (
      <div className="grid min-h-[14rem] flex-1 place-items-center rounded-xl border border-dashed border-accent-ink/15 bg-paper/50 p-6 text-center">
        <div className="max-w-xs space-y-1.5">
          <p className="text-xs font-semibold text-foreground">
            {t("life.needScene")}
          </p>
          <p className="text-[11px] leading-relaxed text-muted">
            {t("life.uploadHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("life.place")}
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4"
    >
      {items.map((hit) => {
        const active = hit.thumbUrl === selectedUrl;
        return (
          <button
            key={hit.thumbUrl}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(hit.thumbUrl)}
            className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-paper p-1.5 text-left transition ${
              active
                ? "border-accent ring-2 ring-accent/30 shadow-[3px_3px_0_0_#12141c]"
                : "border-accent-ink/10 hover:border-accent-ink/30"
            }`}
          >
            <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hit.thumbUrl}
                alt={hit.title || ""}
                className="h-full w-full object-cover transition duration-150 group-hover:scale-[1.02]"
              />
            </span>
            {hit.title ? (
              <span className="mt-1.5 line-clamp-1 px-1 text-[11px] font-medium text-muted">
                {hit.title}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
