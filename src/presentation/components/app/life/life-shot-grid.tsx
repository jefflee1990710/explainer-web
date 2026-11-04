"use client";

import { useEffect, useRef, useState } from "react";
import type { LifeShotKind } from "@/model/life-shot-kind";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicLifeShot } from "@/service/character/life";

const KIND_KEY = {
  selfie: "life.selfie",
  food: "life.food",
  street: "life.street",
  hobby: "life.hobby",
} as const;

const PAGE_BATCH_SIZE = 12;

// Finished & in-progress life photos grid in a multi-column grid view with infinite loading.
export function LifeShotGrid({
  shots,
  selectedId,
  onSelect,
  compact = false,
  infinite = false,
}: {
  shots: PublicLifeShot[];
  selectedId?: string;
  onSelect?: (shot: PublicLifeShot) => void;
  compact?: boolean;
  infinite?: boolean;
}) {
  const { t } = useI18n();
  const [visibleCount, setVisibleCount] = useState(PAGE_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!infinite) return;
    const node = sentinelRef.current;
    if (!node || visibleCount >= shots.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(shots.length, prev + PAGE_BATCH_SIZE));
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [infinite, visibleCount, shots.length]);

  if (!shots.length) {
    return <p className="text-xs text-muted">{t("life.emptyShots")}</p>;
  }

  const displayedShots = infinite ? shots.slice(0, visibleCount) : shots;
  const hasMore = infinite && visibleCount < shots.length;

  return (
    <div className="space-y-4">
      <div
        className={
          compact
            ? "grid grid-cols-3 gap-2"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        }
      >
        {displayedShots.map((shot) => {
          const active = selectedId === shot.id;
          const isGenerating = shot.status === "generating";
          const isFailed = shot.status === "failed";
          const canOpen = Boolean(onSelect && shot.status === "completed" && shot.resultUrl);

          return (
            <figure
              key={shot.id}
              onClick={canOpen && onSelect ? () => onSelect(shot) : undefined}
              className={`group relative aspect-square overflow-hidden rounded-2xl border bg-paper transition ${
                canOpen ? "cursor-pointer" : ""
              } ${
                active
                  ? "border-accent ring-2 ring-accent/40"
                  : isGenerating
                    ? "border-accent/40 bg-accent-ink/5"
                    : isFailed
                      ? "border-red-300 bg-red-50/60"
                      : "border-accent-ink/10 hover:border-accent-ink/30"
              }`}
            >
              {isGenerating ? (
                <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center">
                  {shot.sceneImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.sceneImageUrl}
                      alt={shot.place || shot.characterName}
                      className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[2px]"
                    />
                  ) : null}
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-accent-ink/85 text-lime shadow-sm">
                      <Spinner className="h-4 w-4" />
                    </span>
                    <span className="rounded-2xl bg-accent-ink/85 px-2 py-0.5 text-[10px] font-bold text-lime">
                      背景生成中...
                    </span>
                    <span className="max-w-full truncate px-1 text-[10px] font-semibold text-foreground/80">
                      {shot.place || shot.characterName}
                    </span>
                  </div>
                </div>
              ) : isFailed ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                  <span className="rounded-2xl bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    生成失敗
                  </span>
                  <p className="line-clamp-2 text-[10px] font-medium text-red-600">
                    {shot.error || "點數已自動退回"}
                  </p>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.resultUrl}
                    alt={shot.place || shot.characterName}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 via-black/35 to-transparent px-2.5 pt-5 pb-1.5 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    {shot.place ||
                      shot.characterName ||
                      t(KIND_KEY[shot.kind as LifeShotKind])}
                  </figcaption>
                </>
              )}
            </figure>
          );
        })}
      </div>

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-4 text-xs font-semibold text-zinc-400"
        >
          <Spinner className="mr-2 h-3.5 w-3.5" />
          <span>Loading more...</span>
        </div>
      ) : null}
    </div>
  );
}
