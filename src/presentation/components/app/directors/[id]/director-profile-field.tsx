"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// One labelled profile card: textarea for custom directors, plain text for system ones.
export function DirectorProfileField({
  label,
  value,
  editable,
  modified,
  maxLength,
  rows = 2,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  editable: boolean;
  modified: boolean;
  maxLength: number;
  rows?: number;
  hint?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-accent-ink/10 bg-paper px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold">{label}</h3>
        {modified ? (
          <span className="shrink-0 rounded-full bg-lime px-1.5 py-px text-[10px] font-bold text-accent-ink">
            {t("directors.modified")}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-0.5 text-[11px] leading-4 text-muted">{hint}</p> : null}
      {editable ? (
        <textarea
          rows={rows}
          value={value}
          maxLength={maxLength}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1.5 w-full resize-y rounded-lg border border-accent-ink/15 bg-paper px-2.5 py-1.5 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted">{value || t("directors.profileEmpty")}</p>
      )}
    </div>
  );
}
