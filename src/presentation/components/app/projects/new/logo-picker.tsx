"use client";

import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";

const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

// Opening / Ending logo: preview, upload or replace, and remove.
export function LogoPicker({
  value,
  onChange,
  onError,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-accent-ink/10 bg-[var(--studio-fill)]">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={t("brief.logo.alt")} className="h-full w-full object-contain p-1.5" />
        ) : (
          <span aria-hidden className="h-6 w-6 rounded-md border-2 border-dashed border-accent-ink/25" />
        )}
      </span>
      <BrandUploadButton
        label={value ? t("brief.logo.replace") : t("brief.logo.upload")}
        accept={LOGO_ACCEPT}
        disabled={disabled}
        onUploaded={(asset) => {
          if (asset.kind === "image") onChange(asset.url);
        }}
        onError={onError}
      />
      {value ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2.5 text-xs font-semibold text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("brief.logo.remove")}
        </button>
      ) : null}
    </div>
  );
}
