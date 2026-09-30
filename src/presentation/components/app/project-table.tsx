"use client";

import { AnimatePresence } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ProjectTableRow } from "@/presentation/components/app/project-table-row";
import type { PublicFolder } from "@/presentation/serialize";

// Folder list as a table; the first column is the cover preview.
export function ProjectTable({ folders }: { folders: PublicFolder[] }) {
  const { t } = useI18n();

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-[var(--studio-line)] bg-[var(--studio-panel)] text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="w-[9.5rem] p-3 font-semibold normal-case tracking-normal">
              {t("folder.tablePreview")}
            </th>
            <th scope="col" className="p-3 font-semibold normal-case tracking-normal">
              {t("folder.tableName")}
            </th>
            <th scope="col" className="hidden p-3 font-semibold normal-case tracking-normal sm:table-cell">
              {t("folder.tableVideos")}
            </th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {folders.map((folder) => (
              <ProjectTableRow key={folder.id} folder={folder} />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
