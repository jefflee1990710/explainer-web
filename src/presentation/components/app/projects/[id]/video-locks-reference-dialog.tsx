"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideo } from "@/presentation/serialize";

type Plate = NonNullable<PublicVideo["backgroundPlates"]>[number];

// Shows the prop sheet and empty-set plates used as scene-still locks.
export function VideoLocksReferenceDialog({
  objectSheetUrl,
  objectSheetItems,
  backgroundPlates,
  onClose,
}: {
  objectSheetUrl?: string;
  objectSheetItems?: PublicVideo["objectSheetItems"];
  backgroundPlates?: PublicVideo["backgroundPlates"];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const plates = (backgroundPlates || []).filter((plate): plate is Plate & { url: string } =>
    Boolean(plate.url),
  );
  const propNames = (objectSheetItems || [])
    .map((item) => item.name.trim())
    .filter(Boolean)
    .join("、");

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
      className="flex items-center justify-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      zIndex={110}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,52rem)] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-[var(--studio-line)] bg-paper p-5 shadow-[8px_8px_0_0_#12141c] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("video.editor.locksTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("video.editor.locksIntro")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {objectSheetUrl ? (
            <section>
              <h3 className="text-sm font-semibold">{t("video.editor.locksObjectSheet")}</h3>
              {propNames ? (
                <p className="mt-1 text-xs text-muted">{propNames}</p>
              ) : null}
              <div className="mt-2 overflow-hidden rounded-xl border border-[var(--studio-line)] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={objectSheetUrl}
                  alt=""
                  className="mx-auto max-h-[20rem] w-full object-contain"
                />
              </div>
            </section>
          ) : null}

          {plates.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">{t("video.editor.locksBackgrounds")}</h3>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                {plates.map((plate) => (
                  <li
                    key={plate.setId}
                    className="overflow-hidden rounded-xl border border-[var(--studio-line)] bg-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={plate.url}
                      alt=""
                      className="aspect-video w-full object-contain"
                    />
                    <div className="bg-paper px-3 py-2">
                      <p className="text-xs font-semibold">{plate.name}</p>
                      {plate.clipNumbers.length ? (
                        <p className="mt-0.5 text-[11px] text-muted">
                          {t("video.editor.locksClips", {
                            clips: plate.clipNumbers.join(", "),
                          })}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!objectSheetUrl && plates.length === 0 ? (
            <p className="text-sm text-muted">{t("video.editor.locksEmpty")}</p>
          ) : null}
        </div>
      </div>
    </DialogBackdrop>
  );
}
