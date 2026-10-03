"use client";

import Link from "next/link";
import { FolderNameField } from "@/presentation/components/app/projects/[id]/folder-name-field";
import { VideoTable } from "@/presentation/components/app/projects/[id]/video-table";
import { useFolderGenerationPoll } from "@/presentation/components/app/projects/[id]/use-folder-generation-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicFolder } from "@/presentation/serialize";
import { folderVideoPath } from "@/service/folder-video-path";

// Folder page: paged video table. Create/edit open a new browser tab.
export function ProjectWorkspace({ folder }: { folder: PublicFolder }) {
  const { t } = useI18n();
  useFolderGenerationPoll(folder.videos, true);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/app"
            className="text-sm font-semibold text-muted transition hover:text-foreground"
          >
            {t("video.workspace.backToProjects")}
          </Link>
          <FolderNameField folderId={folder.id} name={folder.name} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">{t("video.workspace.videoCount", { n: folder.videos.length })}</p>
          <Link
            href={folderVideoPath(folder.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent-ink px-5 text-sm font-semibold text-lime shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5"
          >
            {t("video.workspace.createVideo")}
          </Link>
        </div>
      </header>

      <VideoTable folderId={folder.id} videos={folder.videos} />
    </div>
  );
}
