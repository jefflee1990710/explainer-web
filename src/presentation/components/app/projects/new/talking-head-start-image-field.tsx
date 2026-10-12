"use client";

import type { Dispatch, SetStateAction } from "react";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";

const START_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

// One optional photo. Talking-head read uses it as the opening still's reference.
export function TalkingHeadStartImageField({
  value,
  onChange,
  onError,
  disabled,
}: {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">{t("brief.startImage.title")}</p>
      <p className="mt-1 text-xs text-muted">{t("brief.startImage.hint")}</p>
      {value ? (
        <div className="mt-3 w-28">
          <span className="relative block h-28 overflow-hidden rounded-xl bg-[var(--studio-fill)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={t("brief.startImage.alt")} className="h-full w-full object-cover" />
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="mt-1 inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 text-xs font-semibold text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("brief.startImage.remove")}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <BrandUploadButton
            label={t("brief.startImage.add")}
            accept={START_IMAGE_ACCEPT}
            disabled={disabled}
            onUploaded={(asset) => {
              if (asset.kind !== "image") return;
              onChange(asset.url);
            }}
            onError={onError}
          />
        </div>
      )}
    </div>
  );
}
