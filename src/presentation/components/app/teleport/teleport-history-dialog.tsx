"use client";

import { createPortal } from "react-dom";
import { useEffect, useId } from "react";
import type { PublicTeleportJob } from "@/model/teleport-job";
import { TeleportHistoryPanel } from "@/presentation/components/app/teleport/teleport-history-panel";
import { useI18n } from "@/presentation/components/i18n-provider";

/** Modal dialog to browse, preview, download, and delete Teleport job history on narrow viewports. */
export function TeleportHistoryDialog({
  open,
  onClose,
  jobs,
  activeJobId,
  onSelectJob,
  onDeleteJob,
}: {
  open: boolean;
  onClose: () => void;
  jobs: PublicTeleportJob[];
  activeJobId: string | null;
  onSelectJob: (job: PublicTeleportJob) => void;
  onDeleteJob: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const host = document.getElementById("studio-dialog-root") ?? document.body;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[140] grid place-items-center bg-black/50 p-4 lg:hidden"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <h2 id={titleId} className="font-display text-xl font-bold">
            {isEn ? "Teleport History" : "Teleport 歷史紀錄 · History"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <TeleportHistoryPanel
            jobs={jobs}
            activeJobId={activeJobId}
            onSelectJob={onSelectJob}
            onDeleteJob={onDeleteJob}
            layout="modal"
          />
        </div>
      </div>
    </div>,
    host,
  );
}
