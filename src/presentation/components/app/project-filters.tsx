"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { statusFiltersForUi } from "@/util/project-status-i18n";
import type { StatusFilter } from "@/service/project-status";

// Status chips + keyword search for the dashboard grid.
export function ProjectFilters({
  filter,
  query,
  counts,
  onFilter,
  onQuery,
}: {
  filter: StatusFilter;
  query: string;
  counts: Record<StatusFilter, number>;
  onFilter: (value: StatusFilter) => void;
  onQuery: (value: string) => void;
}) {
  const { t } = useI18n();
  const filters = statusFiltersForUi(t);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div
        role="tablist"
        aria-label={t("folder.filterLabel")}
        className="flex flex-wrap gap-0.5 rounded-lg bg-[var(--studio-fill)] p-0.5"
      >
        {filters.map((item) => {
          const active = item.id === filter;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(item.id)}
              className={`relative inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] ${
                active ? "text-[var(--studio-ink)]" : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="project-filter-pill"
                  className="absolute inset-0 rounded-md border border-[var(--studio-line)] bg-white"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              ) : null}
              <span className="relative">{item.label}</span>
              <span
                className={`relative rounded px-1.5 text-[11px] tabular-nums ${
                  active ? "bg-[var(--studio-cyan-soft)] text-[var(--studio-teal)]" : "text-[var(--studio-muted)]"
                }`}
              >
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>

      <label className="relative block md:w-72">
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
    </div>
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
