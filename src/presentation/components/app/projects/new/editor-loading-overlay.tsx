"use client";

import { BrandLoadingIndicator } from "@/presentation/components/brand-loading-indicator";
import { useI18n } from "@/presentation/components/i18n-provider";

// Covers the editor while the video document or timeline media is still loading.
export function EditorLoadingOverlay({
  placement = "fixed",
}: {
  placement?: "fixed" | "absolute";
}) {
  const { t } = useI18n();
  const frame =
    placement === "fixed"
      ? "fixed inset-0 z-[60] md:inset-y-0 md:right-0 md:left-[72px] md:z-40"
      : "absolute inset-0 z-40";

  return (
    <div className={`${frame} grid place-items-center bg-[var(--studio-canvas)]`}>
      <BrandLoadingIndicator label={t("video.workspace.loading")} size="lg" />
    </div>
  );
}
