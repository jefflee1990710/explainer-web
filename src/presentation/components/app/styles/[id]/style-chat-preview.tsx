"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { FRAME_COST } from "@/service/credit-costs";

// Generate / regenerate control inside an AI reply. Shows a live status while the job runs.
export function StyleChatPreview({
  generated,
  generating,
  disabled,
  onGenerate,
}: {
  generated: boolean;
  generating: boolean;
  disabled: boolean;
  onGenerate: () => void;
}) {
  const { t } = useI18n();

  if (generating) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-accent-ink/15 bg-accent-ink/[0.06] px-3 text-xs font-semibold text-muted"
      >
        <Spinner className="h-3.5 w-3.5" />
        {t("styles.previewGenerating")}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={disabled}
      className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      {generated
        ? t("styles.chatPreviewRegenerate", { credits: FRAME_COST })
        : t("styles.chatPreviewGenerate", { credits: FRAME_COST })}
    </button>
  );
}
