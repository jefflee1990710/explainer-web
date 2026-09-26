export const VIDEO_PAGE_SIZE = 10;

export function pageCount(total: number, pageSize = VIDEO_PAGE_SIZE): number {
  if (total <= 0) return 0;
  return Math.ceil(total / pageSize);
}

function clampPage(page: number, total: number, pageSize: number): number {
  const pages = pageCount(total, pageSize);
  if (pages <= 0) return 1;
  return Math.min(Math.max(1, page), pages);
}

// Client-side slice for the folder video table.
export function pageSlice<T>(items: T[], page: number, pageSize = VIDEO_PAGE_SIZE): T[] {
  const safe = clampPage(page, items.length, pageSize);
  const start = (safe - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
