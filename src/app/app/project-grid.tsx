"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  STATUS_FILTERS,
  matchesFilter,
  type StatusFilter,
} from "@/lib/project-status";
import type { PublicProject } from "@/lib/serialize";
import { ProjectCard } from "./project-card";
import { ProjectFilters } from "./project-filters";

// Dashboard grid with client-side status filter + keyword search.
export function ProjectGrid({ projects: initial }: { projects: PublicProject[] }) {
  const [projects, setProjects] = useState(initial);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const result = Object.fromEntries(
      STATUS_FILTERS.map((item) => [item.id, 0]),
    ) as Record<StatusFilter, number>;
    for (const project of projects) {
      for (const item of STATUS_FILTERS) {
        if (matchesFilter(project.status, item.id)) result[item.id] += 1;
      }
    }
    return result;
  }, [projects]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (!matchesFilter(project.status, filter)) return false;
      if (!needle) return true;
      const haystack = [
        project.phaseA?.localizedTitle,
        project.phaseA?.englishTitle,
        project.phaseA?.coreMessage,
        project.source,
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [projects, filter, query]);

  function onUpdate(next: PublicProject) {
    setProjects((list) => list.map((item) => (item.id === next.id ? next : item)));
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
        <p className="font-display text-lg font-bold">還沒有專案</p>
        <p className="mt-2 text-sm text-muted">先選一種風格，貼上題材，就能拿到第一份分鏡。</p>
        <Link
          href="/app/skills"
          className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
        >
          選擇風格
        </Link>
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
              {visible.map((project) => (
                <ProjectCard key={project.id} project={project} onUpdate={onUpdate} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
