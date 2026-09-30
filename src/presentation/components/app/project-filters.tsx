"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Name search above the project grid.
export function ProjectFilters({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (value: string) => void;
}) {
  const { t } = useI18n();

  return (
    <label className="relative block max-w-md">
      <span className="sr-only">{t("folder.searchLabel")}</span>
      <SearchIcon />
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder={t("folder.searchPlaceholder")}
        className="min-h-9 w-full rounded-lg border border-[var(--studio-line)] bg-white pl-10 pr-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)]"
      />
    </label>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
