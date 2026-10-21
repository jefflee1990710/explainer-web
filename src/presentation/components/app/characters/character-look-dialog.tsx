"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { CharacterLookOptionGrid } from "@/presentation/components/app/characters/character-look-option-grid";
import {
  LOOK_DIALOG_PAGE_SIZE,
  filterLookDialogOptions,
  nextLookDialogCount,
  pageLookDialogOptions,
} from "@/presentation/components/app/characters/character-look-dialog-list";
import { useCharacterLookFavourites } from "@/presentation/components/app/characters/use-character-look-favourites";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  lookOptionCategory,
  optionsForLookPart,
  type AnyCharacterLookPart,
  type CharacterLookCategory,
} from "@/service/character/character-look";

const CATEGORIES: readonly CharacterLookCategory[] = ["all", "extreme", "stylized", "classic"];

// Picture grid for one part. The header stays put while the tiles scroll in.
export function CharacterLookDialog({
  part,
  value,
  onChange,
  onClose,
}: {
  part: AnyCharacterLookPart;
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const label = t(`characters.look.${part}`);
  const [tab, setTab] = useState<CharacterLookCategory>("all");
  const [query, setQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const filterKey = `${part}|${tab}|${query}|${favouritesOnly}`;
  const [page, setPage] = useState({ filterKey, visibleCount: LOOK_DIALOG_PAGE_SIZE });
  if (page.filterKey !== filterKey) {
    setPage({ filterKey, visibleCount: LOOK_DIALOG_PAGE_SIZE });
  }
  const visibleCount = page.visibleCount;
  const { ids: favouriteIds, toggle: toggleFavourite } = useCharacterLookFavourites(part);

  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const namedOptions = useMemo(
    () =>
      optionsForLookPart(part)
        .filter((option) => tab === "all" || lookOptionCategory(part, option.id) === tab)
        .map((option) => ({
          id: option.id,
          name: t(`characters.look.options.${part}.${option.id}`),
        })),
    [part, tab, t],
  );

  const filtered = useMemo(
    () =>
      filterLookDialogOptions({
        options: namedOptions,
        query,
        favouriteIds,
        favouritesOnly,
      }),
    [favouriteIds, favouritesOnly, namedOptions, query],
  );

  const visible = pageLookDialogOptions(filtered, visibleCount);
  const hasMore = visible.length < filtered.length;
  const loadMore = useCallback(() => {
    setPage((current) => ({
      ...current,
      visibleCount: nextLookDialogCount(current.visibleCount, filtered.length),
    }));
  }, [filtered.length]);

  const emptyMessage = query.trim()
    ? t("characters.look.emptySearch")
    : t("characters.look.emptyFavourites");

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[min(85vh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/10 bg-paper shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 space-y-2 border-b border-accent-ink/10 px-4 py-3">
          <h2 id={titleId} className="font-display text-xl font-bold">
            {label}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
              {CATEGORIES.map((category) => {
                const activeTab = tab === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={activeTab}
                    onClick={() => setTab(category)}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      activeTab
                        ? "bg-accent-ink text-paper"
                        : "border border-accent-ink/15 bg-paper text-muted hover:border-accent-ink/40 hover:text-foreground"
                    }`}
                  >
                    {t(`characters.look.tabs.${category}`)}
                  </button>
                );
              })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("characters.look.searchPlaceholder")}
              aria-label={t("characters.look.searchLabel")}
              className="h-9 min-w-0 flex-1 rounded-full border border-accent-ink/20 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <button
              type="button"
              aria-pressed={favouritesOnly}
              onClick={() => setFavouritesOnly((current) => !current)}
              className={`h-9 shrink-0 cursor-pointer rounded-full px-3 text-xs font-bold ${
                favouritesOnly
                  ? "bg-accent-ink text-paper"
                  : "border border-accent-ink/15 bg-paper text-muted hover:text-foreground"
              }`}
            >
              {t("characters.look.favourites")}
            </button>
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">{emptyMessage}</p>
        ) : (
          <CharacterLookOptionGrid
            part={part}
            options={visible}
            value={value}
            favouriteIds={favouriteIds}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onToggleFavourite={toggleFavourite}
            onSelect={(id) => {
              onChange(id);
              onClose();
            }}
          />
        )}
      </div>
    </DialogBackdrop>
  );
}
