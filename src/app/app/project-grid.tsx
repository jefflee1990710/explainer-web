"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  STATUS_FILTERS,
  matchesFilter,
  type StatusFilter,
} from "@/lib/project-status";
import type { PublicFolder } from "@/lib/serialize";
import { CreateFolderButton } from "./create-folder-modal";
import { ProjectCard } from "./project-card";
import { ProjectFilters } from "./project-filters";

// Dashboard grid with client-side status filter + keyword search over folders.
export function ProjectGrid({ folders }: { folders: PublicFolder[] }) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const result = Object.fromEntries(
      STATUS_FILTERS.map((item) => [item.id, 0]),
    ) as Record<StatusFilter, number>;
    for (const folder of folders) {
      for (const item of STATUS_FILTERS) {
        if (matchesFilter(folder.status, item.id)) result[item.id] += 1;
      }
    }
    return result;
  }, [folders]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return folders.filter((folder) => {
      if (!matchesFilter(folder.status, filter)) return false;
      if (!needle) return true;
      const haystack = [
        folder.name,
        ...folder.videos.flatMap((video) => [
          video.phaseA?.localizedTitle,
          video.phaseA?.englishTitle,
          video.source,
        ]),
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [folders, filter, query]);

  if (folders.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
        <p className="font-display text-lg font-bold">還沒有專案</p>
        <p className="mt-2 text-sm text-muted">先幫這次活動取個名字，再進去加影片。</p>
        <CreateFolderButton className="mt-5 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5" />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-5">
        <ProjectFilters
          filter={filter}
          query={query}
          counts={counts}
          onFilter={setFilter}
          onQuery={setQuery}
        />

        {visible.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-accent-ink/10 bg-paper/60 px-5 py-8 text-center text-sm text-muted"
          >
            沒有符合的專案。試試其他篩選或關鍵字。
          </motion.p>
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((folder) => (
                <ProjectCard key={folder.id} folder={folder} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
