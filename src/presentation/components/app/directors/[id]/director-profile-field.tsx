"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// One labelled profile card: textarea for custom directors, plain text for system ones.
export function DirectorProfileField({
  label,
  value,
  editable,
  modified,
  maxLength,
  rows = 3,
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
    <div className="rounded-[1.25rem] border border-accent-ink/10 bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        {modified ? (
          <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-xs font-bold">{t("directors.modified")}</span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {editable ? (
        <textarea
          rows={rows}
          value={value}
          maxLength={maxLength}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{value || t("directors.profileEmpty")}</p>
      )}
    </div>
  );
}
