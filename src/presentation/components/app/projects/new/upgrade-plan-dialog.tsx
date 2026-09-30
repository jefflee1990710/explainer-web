"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
// Overlay inside the video editor when a produce-video click cannot be paid.
// `videoCost` is the per-second price of the clip (or cheapest clip) clicked.
export function UpgradePlanDialog({
  videoCost,
  onClose,
}: {
  videoCost: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl font-bold">
          {t("billing.videoUpgradeTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {t("billing.videoUpgradeBody", { credits: videoCost })}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            {t("billing.videoUpgradeDismiss")}
          </button>
          <Link
            href="/app/billing"
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent-ink px-5 text-sm font-semibold text-lime transition hover:-translate-y-0.5"
          >
            {t("billing.videoUpgradeCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
