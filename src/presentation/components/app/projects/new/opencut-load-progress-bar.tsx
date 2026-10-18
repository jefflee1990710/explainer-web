"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

export type OpenCutLoadProgress = {
  current: number;
  total: number;
  label?: string;
};

// Shows clip-by-clip media seeding / restore progress above the inline OpenCut editor.
export function OpenCutLoadProgressBar({
  progress,
}: {
  progress: OpenCutLoadProgress | null;
}) {
  const { t } = useI18n();
  if (!progress) return null;

  const percent = Math.round((progress.current / Math.max(1, progress.total)) * 100);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center gap-3 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-1.5 text-xs"
    >
      <span className="font-semibold text-[var(--studio-ink)]">
        {t("common.loading")} {progress.label ? `${progress.label} ` : ""}(
        {progress.current}/{progress.total} · {percent}%)
      </span>
      <div className="h-1.5 w-36 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-[#12141c] transition-all duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
