"use client";

import type { Dispatch, SetStateAction } from "react";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MAX_BACKGROUND_IMAGES } from "@/service/project/background-images";

const BACKGROUND_ACCEPT = "image/png,image/jpeg,image/webp";

// Up to two room photos for a talking-head read. They replace the bookshelf set.
export function TalkingHeadBackgroundField({
  value,
  onChange,
  onError,
  disabled,
}: {
  value: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">{t("brief.backgrounds.title")}</p>
      <p className="mt-1 text-xs text-muted">
        {t("brief.backgrounds.hint", { max: String(MAX_BACKGROUND_IMAGES) })}
      </p>
      {value.length ? (
        <ul className="mt-3 flex flex-wrap gap-3">
          {value.map((url, index) => (
            <li key={`${index}-${url}`} className="w-28">
              <span className="relative block h-28 overflow-hidden rounded-xl bg-[var(--studio-fill)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={t("brief.backgrounds.alt", { n: String(index + 1) })}
                  className="h-full w-full object-cover"
                />
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, item) => item !== index))}
                className="mt-1 inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 text-xs font-semibold text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("brief.backgrounds.remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length < MAX_BACKGROUND_IMAGES ? (
        <div className="mt-3">
          <BrandUploadButton
            label={t("brief.backgrounds.add")}
            accept={BACKGROUND_ACCEPT}
            disabled={disabled}
            onUploaded={(asset) => {
              if (asset.kind !== "image") return;
              onChange((prev) =>
                prev.length >= MAX_BACKGROUND_IMAGES || prev.includes(asset.url)
                  ? prev
                  : [...prev, asset.url],
              );
            }}
            onError={onError}
          />
        </div>
      ) : null}
    </div>
  );
}
