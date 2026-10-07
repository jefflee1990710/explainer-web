"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { folderPath } from "@/service/folder-video-path";

// Video list, this project, then the open video.
export function VideoEditorBreadcrumb({
  folderId,
  folderName,
  title,
  titleId,
}: {
  folderId: string;
  folderName: string;
  title: string;
  titleId: string;
}) {
  const { t } = useI18n();
  const linkClass =
    "font-medium text-[var(--studio-muted)] transition-colors duration-200 hover:text-[var(--studio-ink)]";

  return (
    <nav aria-label={t("video.editor.breadcrumbAria")} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="shrink-0">
          <Link href="/app" className={linkClass}>
            {t("nav.projects")}
          </Link>
        </li>
        <CrumbSep />
        <li className="min-w-0 max-w-[14rem]">
          <Link href={folderPath(folderId)} className={`block truncate ${linkClass}`}>
            {folderName}
          </Link>
        </li>
        <CrumbSep />
        <li className="min-w-0">
          <h1 id={titleId} className="truncate font-display text-base font-bold sm:text-xl">
            {title}
          </h1>
        </li>
      </ol>
    </nav>
  );
}

function CrumbSep() {
  return (
    <li aria-hidden className="shrink-0 text-[var(--studio-muted)]">
      /
    </li>
  );
}
