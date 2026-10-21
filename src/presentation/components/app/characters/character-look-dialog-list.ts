// Filter, rank, and page the character-look picker. Names are already translated.

export const LOOK_DIALOG_PAGE_SIZE = 24;

export type LookDialogOption = {
  id: string;
  name: string;
};

export function filterLookDialogOptions({
  options,
  query,
  favouriteIds,
  favouritesOnly,
}: {
  options: readonly LookDialogOption[];
  query: string;
  favouriteIds: ReadonlySet<string>;
  favouritesOnly: boolean;
}): LookDialogOption[] {
  const needle = query.trim().toLowerCase();
  const matched = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => {
      if (favouritesOnly && !favouriteIds.has(option.id)) return false;
      if (needle && !option.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  matched.sort((a, b) => {
    const aRank = favouriteIds.has(a.option.id) ? 0 : 1;
    const bRank = favouriteIds.has(b.option.id) ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return a.index - b.index;
  });
  return matched.map(({ option }) => option);
}

export function pageLookDialogOptions<T>(options: readonly T[], visibleCount: number): T[] {
  return options.slice(0, visibleCount);
}

export function nextLookDialogCount(
  visibleCount: number,
  total: number,
  pageSize = LOOK_DIALOG_PAGE_SIZE,
) {
  return Math.min(total, visibleCount + pageSize);
}
