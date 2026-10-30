"use client";

import { useMemo, useState } from "react";
import { DirectorDetailPanel } from "@/app/scroadmin/analytics/directors/director-detail-panel";
import type { HardcodedDirectorCatalog } from "@/service/director/admin-catalog";

// Searchable inspector for every hardcoded director on /scroadmin/analytics/directors.
export function DirectorCatalogBrowser({ catalog }: { catalog: HardcodedDirectorCatalog }) {
  const [query, setQuery] = useState("");
  const [slug, setSlug] = useState(catalog.directors[0]?.slug ?? "");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return catalog.directors;
    return catalog.directors.filter((director) =>
      [director.title, director.slug, director.description, director.suggestedUseCase]
        .join("\n")
        .toLowerCase()
        .includes(needle),
    );
  }, [catalog.directors, query]);
  const selected = catalog.directors.find((director) => director.slug === slug) ?? filtered[0];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
      <aside className="space-y-3 lg:sticky lg:top-6">
        <label className="block">
          <span className="sr-only">搜尋導演</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋名稱或 slug"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-[#c6f24b] focus:ring-2"
          />
        </label>
        <p className="text-xs text-zinc-500">{filtered.length} 個導演</p>
        <ul className="max-h-[70vh] space-y-1 overflow-auto pr-1">
          {filtered.map((director) => {
            const active = director.slug === selected?.slug;
            return (
              <li key={director.slug}>
                <button
                  type="button"
                  onClick={() => setSlug(director.slug)}
                  className={`w-full rounded-xl px-3 py-2 text-left ${
                    active ? "bg-[#12141c] text-white" : "bg-white text-[#12141c] hover:bg-zinc-100"
                  }`}
                >
                  <span className="block text-sm font-semibold">{director.title}</span>
                  <span className={`mt-0.5 block truncate font-mono text-[11px] ${active ? "text-white/60" : "text-zinc-400"}`}>
                    {director.slug}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <div>{selected ? <DirectorDetailPanel director={selected} /> : <p className="text-sm text-zinc-500">沒有符合的導演。</p>}</div>
    </div>
  );
}
