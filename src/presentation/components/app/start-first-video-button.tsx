"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ensureDefaultFolderAction } from "@/presentation/actions/projects";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { folderVideoPath } from "@/service/folder-video-path";

const DEFAULT_PRIMARY_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 py-2 text-sm font-semibold text-lime shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";

// One-click onboarding CTA that reuses the user's latest folder or creates a default folder in the background, then opens the new-video wizard directly.
export function StartFirstVideoButton({
  existingFolderId,
  className = DEFAULT_PRIMARY_CLASS,
  children,
}: {
  existingFolderId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const defaultLabel =
    locale === "zh-Hant"
      ? "✨ 立即製作第一支短片"
      : locale === "zh-Hans"
        ? "✨ 立即制作第一支短片"
        : "✨ Create Your First Video";

  const defaultFolderName =
    locale === "zh-Hant"
      ? "我的第一個專案"
      : locale === "zh-Hans"
        ? "我的第一个项目"
        : "My First Project";

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    if (existingFolderId) {
      router.push(folderVideoPath(existingFolderId));
      return;
    }
    const result = await ensureDefaultFolderAction(defaultFolderName);
    if (!result.ok) {
      setBusy(false);
      return;
    }
    router.push(folderVideoPath(result.folder.id));
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={busy}
      className={className}
    >
      {busy ? <Spinner className="h-4 w-4" /> : null}
      {children ?? defaultLabel}
    </button>
  );
}
