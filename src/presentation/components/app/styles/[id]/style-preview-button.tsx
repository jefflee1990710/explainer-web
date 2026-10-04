"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateUserStylePreviewAction } from "@/presentation/actions/styles";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import { FRAME_COST } from "@/service/credit-costs";
import type { PreviewStatus } from "@/model/user-style";
import { translateAppError } from "@/util/i18n/translate-app-error";

const POLL_MS = 4000;

// Generate is off while the draft is unsaved or a preview is already running.
export function StylePreviewButton({
  styleId,
  dirty,
  previewStatus,
  compact = false,
  onGenerating,
}: {
  styleId: string;
  dirty: boolean;
  previewStatus: PreviewStatus;
  compact?: boolean;
  onGenerating: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const generating = previewStatus === "generating" || pending;
  const disabled = dirty || generating;

  // Same cadence as use-character-poll: refresh immediately, then every 4 seconds.
  useEffect(() => {
    if (previewStatus !== "generating") return;
    let cancelled = false;
    function tick() {
      if (!cancelled) router.refresh();
    }
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [previewStatus, router]);

  async function onClick() {
    if (disabled) return;
    setError("");
    setPending(true);
    try {
      const result = await generateUserStylePreviewAction({ id: styleId });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      onGenerating();
      router.refresh();
    } catch {
      setError(t("errors.stylePreviewFailed"));
    } finally {
      setPending(false);
    }
  }

  const label = generating
    ? t("styles.previewGenerating")
    : t("styles.generatePreview", { credits: FRAME_COST });

  return (
    <div className={`flex flex-wrap items-center ${compact ? "gap-2" : "mt-4 gap-3"}`}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={disabled}
        aria-busy={generating}
        className={
          compact
            ? "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {generating ? <Spinner className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> : null}
        {label}
      </button>
      {dirty ? <p className={compact ? "text-[11px] text-muted" : "text-sm text-muted"}>{t("styles.generateNeedsSave")}</p> : null}
      {previewStatus === "failed" && !generating ? (
        <p role="alert" className={compact ? "text-[11px] font-medium text-accent" : "text-sm font-medium text-accent"}>
          {t("styles.previewFailed")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={compact ? "text-[11px] font-medium text-accent" : "w-full text-sm font-medium text-accent"}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
