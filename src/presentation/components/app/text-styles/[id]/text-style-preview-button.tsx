"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateTextStylePreviewAction } from "@/presentation/actions/text-styles";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import { FRAME_COST } from "@/service/credit-costs";
import type { TextStylePreviewStatus } from "@/model/text-style";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Flush auto-save first so the job reads the latest lookLine from the database.
export function TextStylePreviewButton({
  styleId,
  previewStatus,
  previewCurrent = false,
  onEnsureSaved,
  onGenerating,
}: {
  styleId: string;
  previewStatus: TextStylePreviewStatus;
  previewCurrent?: boolean;
  onEnsureSaved?: () => Promise<boolean>;
  onGenerating: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const generating = previewStatus === "generating" || pending;
  const disabled = generating || previewCurrent;

  async function onClick() {
    if (disabled) return;
    setError("");
    setPending(true);
    try {
      if (onEnsureSaved) {
        const saved = await onEnsureSaved();
        if (!saved) return;
      }
      const result = await generateTextStylePreviewAction({ id: styleId });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      if (result.alreadyCurrent) return;
      onGenerating();
      router.refresh();
    } catch {
      setError(t("errors.stylePreviewFailed"));
    } finally {
      setPending(false);
    }
  }

  const label = generating
    ? t("textStyles.previewGenerating")
    : t("textStyles.generateSample", { credits: FRAME_COST });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={disabled}
        aria-busy={generating}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generating ? <Spinner className="h-3.5 w-3.5" /> : null}
        {label}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
