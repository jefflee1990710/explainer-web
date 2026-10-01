"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PreviewStrip } from "@/presentation/components/app/preview-strip";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicFolder } from "@/presentation/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// One folder row: preview thumbnail first, then name and video count.
export function ProjectTableRow({ folder }: { folder: PublicFolder }) {
  const { t } = useI18n();
  const router = useRouter();
  const href = `/app/projects/${folder.id}`;

  function goToProject() {
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToProject();
    }
  }

  return (
    <motion.tr
      layout
      role="link"
      tabIndex={0}
      aria-label={folder.name}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.28, ease }}
      onClick={goToProject}
      onKeyDown={onKeyDown}
      className="group cursor-pointer border-b border-[var(--studio-line)] last:border-b-0 hover:bg-[var(--studio-fill)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
    >
      <td className="w-[9.5rem] p-3 align-middle">
        <div className="relative aspect-video w-32 overflow-hidden rounded-lg border border-[var(--studio-line)] bg-accent-ink/5">
          {folder.previewUrls.length ? (
            <PreviewStrip urls={folder.previewUrls} alt={t("folder.previewAlt", { name: folder.name })} />
          ) : (
            <FolderPreviewPlaceholder />
          )}
        </div>
      </td>
      <td className="min-w-0 p-3 align-middle">
        <span className="block min-w-0 font-semibold text-[var(--studio-ink)] group-hover:underline">
          <span className="line-clamp-2">{folder.name}</span>
        </span>
        <p className="mt-1 text-xs text-muted sm:hidden">{t("folder.videoCount", { n: folder.videoCount })}</p>
      </td>
      <td className="hidden p-3 align-middle text-sm tabular-nums text-muted sm:table-cell">
        {t("folder.videoCount", { n: folder.videoCount })}
      </td>
    </motion.tr>
  );
}

function FolderPreviewPlaceholder() {
  return (
    <div className="studio-grid grid h-full w-full place-items-center">
      <span className="h-6 w-10 rounded border-2 border-dashed border-accent-ink/25" />
    </div>
  );
}
