"use client";

import { useEffect, useRef } from "react";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import type { LookDialogOption } from "@/presentation/components/app/characters/character-look-dialog-list";
import { useI18n } from "@/presentation/components/i18n-provider";
import { isExaggeratedLookOption, type AnyCharacterLookPart } from "@/service/character/character-look";

// Scrollable option tiles. The parent owns paging and passes only the visible slice.
export function CharacterLookOptionGrid({
  part,
  options,
  value,
  favouriteIds,
  hasMore,
  disabled = false,
  onLoadMore,
  onToggleFavourite,
  onSelect,
}: {
  part: AnyCharacterLookPart;
  options: readonly LookDialogOption[];
  value: string;
  favouriteIds: ReadonlySet<string>;
  hasMore: boolean;
  disabled?: boolean;
  onLoadMore: () => void;
  onToggleFavourite: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { root, rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, options.length]);

  return (
    <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <div
        role="radiogroup"
        aria-label={t(`characters.look.${part}`)}
        className="grid w-full content-start gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(5.25rem,6.25rem))]"
      >
        {options.map((option) => {
          const active = option.id === value;
          const extreme = isExaggeratedLookOption(part, option.id);
          const favourite = favouriteIds.has(option.id);
          return (
            <div
              key={option.id}
              className={`relative rounded-xl border bg-paper p-1.5 ${
                active ? "border-accent shadow-[2px_2px_0_0_#12141c]" : "border-accent-ink/10"
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onSelect(option.id)}
                className="block w-full cursor-pointer text-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative block aspect-square overflow-hidden rounded-lg bg-zinc-200">
                  <CharacterLookArt part={part} id={option.id} />
                  {extreme ? (
                    <span className="absolute top-1 right-1 rounded-full bg-accent-ink px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider text-paper">
                      {t("characters.look.extremeBadge")}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block line-clamp-2 text-[11px] font-semibold leading-4">{option.name}</span>
              </button>
              <button
                type="button"
                aria-pressed={favourite}
                aria-label={
                  favourite
                    ? t("characters.look.favouriteRemove", { name: option.name })
                    : t("characters.look.favouriteAdd", { name: option.name })
                }
                onClick={() => onToggleFavourite(option.id)}
                className={`absolute top-2 left-2 z-10 grid h-6 w-6 cursor-pointer place-items-center rounded-full border text-[11px] ${
                  favourite
                    ? "border-accent-ink bg-accent-ink text-paper"
                    : "border-accent-ink/15 bg-paper/90 text-muted hover:text-foreground"
                }`}
              >
                <HeartIcon filled={favourite} />
              </button>
            </div>
          );
        })}
      </div>
      {hasMore ? <div ref={sentinelRef} className="h-8" aria-hidden /> : null}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M8 13.2 2.8 8.2a2.8 2.8 0 0 1 4-4L8 5.3l1.2-1.1a2.8 2.8 0 0 1 4 4L8 13.2Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
