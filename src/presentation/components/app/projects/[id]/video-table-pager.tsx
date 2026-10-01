"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Previous / next controls for the client-side video table.
export function VideoTablePager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const { t } = useI18n();
  if (pages <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {t("video.pager.page", { page, pages })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent-ink/15 px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {t("video.pager.prev")}
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent-ink/15 px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {t("video.pager.next")}
        </button>
      </div>
    </div>
  );
}
