"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";

// Full-screen lightbox dialog when clicking a character blueprint image.
export function CharacterImagePreviewDialog({
  src,
  title,
  alt,
  onClose,
}: {
  src: string;
  title: string;
  alt: string;
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
    <DialogBackdrop
      className="flex items-center justify-center bg-accent-ink/55 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      zIndex={110}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/15 bg-paper shadow-[8px_8px_0_0_#12141c]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-accent-ink/10 px-5 py-3.5">
          <h2 id={titleId} className="font-display text-base font-bold sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-3.5 py-1.5 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-white p-3 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[calc(94dvh-5.5rem)] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </DialogBackdrop>
  );
}
