// Filter, rank, and page the character-look picker. Names are already translated.

export const LOOK_DIALOG_PAGE_SIZE = 24;

export type LookDialogOption = {
  id: string;
  name: string;
  description?: string;
  tags?: readonly string[];
};

export function filterLookDialogOptions({
  options,
  query,
  favouriteIds,
  favouritesOnly,
  tags,
}: {
  options: readonly LookDialogOption[];
  query: string;
  favouriteIds: ReadonlySet<string>;
  favouritesOnly: boolean;
  tags?: readonly string[];
}): LookDialogOption[] {
  const needle = query.trim().toLowerCase();
  const requiredTags = (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const matched = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => {
      if (favouritesOnly && !favouriteIds.has(option.id)) return false;
      if (requiredTags.length) {
        const have = new Set((option.tags ?? []).map((tag) => tag.toLowerCase()));
        if (!requiredTags.every((tag) => have.has(tag))) return false;
      }
      if (!needle) return true;
      const haystack = [option.name, option.description ?? "", ...(option.tags ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  matched.sort((a, b) => {
    // "none" is always pinned as the very first choice before custom items and favourites.
    const aNone = a.option.id === "none" ? 0 : 1;
    const bNone = b.option.id === "none" ? 0 : 1;
    if (aNone !== bNone) return aNone - bNone;
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
