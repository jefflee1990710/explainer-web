"use client";

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
}: {
  value: ReferenceImageDraft[];
  onChange: (next: ReferenceImageDraft[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  function update(index: number, description: string) {
    onChange(value.map((item, i) => (i === index ? { ...item, description } : item)));
  }

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">{t("brief.references.title")}</p>
      <p className="mt-1 text-xs text-muted">
        {t("brief.references.hint", { max: String(MAX_REFERENCE_IMAGES) })}
      </p>
      <ul className="mt-3 space-y-3">
        {value.map((item, index) => {
          const id = `R${index + 1}`;
          return (
            <li key={item.url} className="flex gap-3 rounded-2xl border border-accent-ink/10 bg-paper p-3">
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
      {value.length < MAX_REFERENCE_IMAGES ? (
        <div className="mt-3">
          <BrandUploadButton
            label={t("brief.references.add")}
            accept={REFERENCE_ACCEPT}
            disabled={disabled}
            onUploaded={(asset) => {
              if (asset.kind === "image") onChange([...value, { url: asset.url, description: "" }]);
            }}
            onError={onError}
          />
        </div>
      ) : null}
    </div>
  );
}
