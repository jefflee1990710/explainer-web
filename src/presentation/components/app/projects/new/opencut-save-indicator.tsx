"use client";

import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";

// Header chip shown while an OpenCut autosave request is in flight.
export function OpenCutSaveIndicator({ saving }: { saving: boolean }) {
  const { t } = useI18n();
  if (!saving) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 pr-1 text-xs font-medium text-muted"
    >
      <Spinner className="h-3.5 w-3.5" />
      {t("video.opencut.saving")}
    </span>
  );
}
