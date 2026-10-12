"use client";

import { useState } from "react";
import { retrySubtitlePlateAction } from "@/presentation/actions/generation";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideo } from "@/presentation/serialize";
import { FRAME_COST } from "@/service/credit-costs";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Redo one clip's subtitle plate (FRAME_COST credits). Sits above the plate overlay
// (z-40 over its z-20, and that overlay is pointer-events-none) so clicks always land here.
export function ClipPlateRetry({
  videoId,
  clipNumber,
  plateError,
  onProject,
}: {
  videoId: string;
  clipNumber: number;
  // Why the last plate failed, when the row has one.
  plateError?: string;
  onProject?: (project: PublicVideo) => void;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const shown = error || plateError || "";

  async function retry() {
    if (pending) return;
    setPending(true);
    setError("");
    const result = await retrySubtitlePlateAction(videoId, clipNumber);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onProject?.(result.project);
  }

  return (
    <div className="absolute inset-x-0 bottom-2 z-40 flex flex-col items-center gap-1 px-2">
      {shown ? (
        <span className="rounded bg-white/85 px-2 py-0.5 text-center text-[10px] font-semibold text-accent">
          {translateAppError(shown, t)}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => void retry()}
        disabled={pending}
        aria-label={t("production.video.retryPlateAria", { cost: FRAME_COST })}
        className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--studio-ink)] px-3 py-1.5 font-display text-[11px] font-bold text-white shadow-md disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? <Spinner className="h-3.5 w-3.5" /> : null}
        {t("production.video.retryPlate", { cost: FRAME_COST })}
      </button>
    </div>
  );
}
