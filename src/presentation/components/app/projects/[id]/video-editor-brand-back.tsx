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
        aria-label={t("video.editor.back")}
        title={t("video.editor.back")}
        className="grid h-10 w-10 place-items-center text-[var(--studio-muted)] transition hover:text-[var(--studio-ink)]"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M19 12H6" />
          <path d="m11 6-6 6 6 6" />
        </svg>
      </Link>
    </div>
  );
}
