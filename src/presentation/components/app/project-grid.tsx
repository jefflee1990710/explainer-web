"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicFolder } from "@/presentation/serialize";
import { CreateFolderButton } from "@/presentation/components/app/create-folder-modal";
import { ProjectCard } from "@/presentation/components/app/project-card";
import { ProjectFilters } from "@/presentation/components/app/project-filters";

// Dashboard project cards. Search matches the project name only.
export function ProjectGrid({ folders }: { folders: PublicFolder[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(needle));
  }, [folders, query]);

  if (folders.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
        <p className="font-display text-lg font-bold">{t("folder.emptyTitle")}</p>
        <p className="mt-2 text-sm text-muted">{t("folder.emptyBody")}</p>
        <CreateFolderButton className="mt-5 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5" />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-5">
        <ProjectFilters query={query} onQuery={setQuery} />

        {visible.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-accent-ink/10 bg-paper/60 px-5 py-8 text-center text-sm text-muted"
          >
            {t("folder.noMatch")}
          </motion.p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {visible.map((folder) => (
                <ProjectCard key={folder.id} folder={folder} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
