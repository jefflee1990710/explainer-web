"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

type BlogPostPaginationProps = {
  page: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  tag?: string;
  q?: string;
};

// Build href for `/posts` while preserving optional `tag` and `q` filters.
function buildPageHref(page: number, tag?: string, q?: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (tag) params.set("tag", tag);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/posts?${query}` : "/posts";
}

// Pagination bar for the public `/posts` listing page.
export function BlogPostPagination({
  page,
  totalPages,
  hasPrevPage,
  hasNextPage,
  tag,
  q,
}: BlogPostPaginationProps) {
  const { t } = useI18n();

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between border-t border-white/10 pt-6"
    >
      <div>
        {hasPrevPage ? (
          <Link
            href={buildPageHref(page - 1, tag, q)}
            className="inline-flex items-center rounded-xl border border-white/15 bg-[#131722] px-4 py-2 text-sm font-medium text-zinc-200 shadow-2xs transition hover:border-white/30 hover:bg-white/10"
          >
            {t("blogPage.prevPage")}
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-500">
            {t("blogPage.prevPage")}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-zinc-300">
        {t("blogPage.pageOf", { page, total: totalPages })}
      </p>

      <div>
        {hasNextPage ? (
          <Link
            href={buildPageHref(page + 1, tag, q)}
            className="inline-flex items-center rounded-xl border border-white/15 bg-[#131722] px-4 py-2 text-sm font-medium text-zinc-200 shadow-2xs transition hover:border-white/30 hover:bg-white/10"
          >
            {t("blogPage.nextPage")}
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-500">
            {t("blogPage.nextPage")}
          </span>
        )}
      </div>
    </nav>
  );
}
