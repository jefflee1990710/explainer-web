"use client";

import type { Dispatch, SetStateAction } from "react";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  MAX_REFERENCE_IMAGES,
  REFERENCE_DESCRIPTION_MAX,
} from "@/service/project/reference-images";

const REFERENCE_ACCEPT = "image/png,image/jpeg,image/webp";

export type ReferenceImageDraft = { url: string; description: string };

// Up to 4 brief reference images: thumbnail, required description, remove.
export function ReferenceImagesField({
  value,
  onChange,
  onError,
  disabled,
  hideHeader = false,
}: {
  value: ReferenceImageDraft[];
  // Accepts an updater so a finished upload appends to the latest rows, not the ones at upload start.
  onChange: Dispatch<SetStateAction<ReferenceImageDraft[]>>;
  onError: (message: string) => void;
  disabled?: boolean;
  hideHeader?: boolean;
}) {
  const { t } = useI18n();

  function update(index: number, description: string) {
    onChange(value.map((item, i) => (i === index ? { ...item, description } : item)));
  }

  return (
    <div className={hideHeader ? "" : "mt-5"}>
      {!hideHeader ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{t("brief.references.title")}</p>
            <span className="rounded-full bg-accent-ink/8 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
              {value.length} / {MAX_REFERENCE_IMAGES}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {t("brief.references.hint", { max: String(MAX_REFERENCE_IMAGES) })}
          </p>
        </>
      ) : null}

      {value.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {value.map((item, index) => {
            const id = `R${index + 1}`;
            return (
              <li key={`${index}-${item.url}`} className="flex gap-3 rounded-2xl border border-accent-ink/10 bg-paper p-3">
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--studio-fill)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={t("brief.references.alt", { id })} className="h-full w-full object-cover" />
                  <span className="font-display absolute left-1 top-1 rounded-full bg-lime px-1.5 text-[10px] font-bold">
                    {id}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <label className="sr-only" htmlFor={`reference-${id}`}>
                    {t("brief.references.descriptionLabel", { id })}
                  </label>
                  <textarea
                    id={`reference-${id}`}
                    rows={2}
                    required
                    maxLength={REFERENCE_DESCRIPTION_MAX}
                    value={item.description}
                    disabled={disabled}
                    onChange={(event) => update(index, event.target.value)}
                    placeholder={t("brief.references.descriptionPlaceholder")}
                    className="w-full resize-y rounded-xl border border-accent-ink/15 bg-white px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(value.filter((_, i) => i !== index))}
                      className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2.5 text-xs font-semibold text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("brief.references.remove")}
                    </button>
                    <span className="text-xs tabular-nums text-muted">
                      {t("brief.references.descriptionCount", {
                        n: String(item.description.length),
                        max: String(REFERENCE_DESCRIPTION_MAX),
                      })}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent-ink/15 bg-paper/60 px-4 py-8 text-center">
          <span
            aria-hidden="true"
            className="mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-accent-ink/5 text-muted"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" />
              <circle cx="7.5" cy="8" r="1.5" />
              <path d="m17.5 13-3.8-3.8a1.5 1.5 0 0 0-2.1 0L5.5 15.5" />
            </svg>
          </span>
          <BrandUploadButton
            label={t("brief.references.add")}
            accept={REFERENCE_ACCEPT}
            disabled={disabled}
            onUploaded={(asset) => {
              if (asset.kind !== "image") return;
              onChange((prev) =>
                prev.length >= MAX_REFERENCE_IMAGES
                  ? prev
                  : [...prev, { url: asset.url, description: "" }],
              );
            }}
            onError={onError}
          />
          <span className="mt-2 text-[11px] tabular-nums text-muted">
            0 / {MAX_REFERENCE_IMAGES}
          </span>
        </div>
      )}

      {value.length > 0 && value.length < MAX_REFERENCE_IMAGES ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <BrandUploadButton
            label={t("brief.references.add")}
            accept={REFERENCE_ACCEPT}
            disabled={disabled}
            onUploaded={(asset) => {
              if (asset.kind !== "image") return;
              onChange((prev) =>
                prev.length >= MAX_REFERENCE_IMAGES
                  ? prev
                  : [...prev, { url: asset.url, description: "" }],
              );
            }}
            onError={onError}
          />
          <span className="text-xs tabular-nums text-muted">
            {value.length} / {MAX_REFERENCE_IMAGES}
          </span>
        </div>
      ) : null}
    </div>
  );
}
