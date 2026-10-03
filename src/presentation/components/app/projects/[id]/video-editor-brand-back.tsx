"use client";

import Link from "next/link";
import { BrandMark } from "@/presentation/components/brand-mark";
import { useI18n } from "@/presentation/components/i18n-provider";
import { folderPath } from "@/service/folder-video-path";

// Editor chrome: mark goes home, back returns to this folder's video list.
export function VideoEditorBrandBack({ folderId }: { folderId: string }) {
  const { t } = useI18n();
  return (
    <div className="flex shrink-0 items-center gap-3">
      <BrandMark href="/app" wordClassName="sr-only" />
      <Link
        href={folderPath(folderId)}
        className="text-sm font-semibold text-[var(--studio-muted)] transition hover:text-[var(--studio-ink)]"
      >
        {t("video.editor.back")}
      </Link>
    </div>
  );
}
