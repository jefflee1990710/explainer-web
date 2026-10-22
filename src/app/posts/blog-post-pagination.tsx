import Link from "next/link";

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
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between border-t border-zinc-200 pt-6"
    >
      <div>
        {hasPrevPage ? (
          <Link
            href={buildPageHref(page - 1, tag, q)}
            className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            ← Previous
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-400">
            ← Previous
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-600">
        Page <span className="font-semibold text-zinc-900">{page}</span> of{" "}
        <span className="font-semibold text-zinc-900">{totalPages}</span>
      </p>

      <div>
        {hasNextPage ? (
          <Link
            href={buildPageHref(page + 1, tag, q)}
            className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Next →
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-400">
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
