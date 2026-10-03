"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

const CANVAS_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// One labelled visual field: textarea for custom styles, plain text for system styles.
export function StyleField({
  label,
  value,
  editable,
  modified,
  maxLength,
  rows = 3,
  kind = "text",
  onChange,
}: {
  label: string;
  value: string;
  editable: boolean;
  modified: boolean;
  maxLength: number;
  rows?: number;
  kind?: "text" | "color";
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const colorValid = CANVAS_COLOR_RE.test(value);

  return (
    <div className="rounded-[1.25rem] border border-accent-ink/10 bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        {modified ? (
          <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-xs font-bold">{t("styles.modified")}</span>
        ) : null}
      </div>
      {editable && kind === "color" ? (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="color"
            aria-label={label}
            value={colorValid ? value : "#000000"}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-14 cursor-pointer rounded-lg border border-accent-ink/15 bg-paper"
          />
          <input
            type="text"
            value={value}
            maxLength={maxLength}
            spellCheck={false}
            aria-label={label}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>
      ) : editable ? (
        <textarea
          rows={rows}
          value={value}
          maxLength={maxLength}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{value || t("styles.fieldEmpty")}</p>
      )}
    </div>
  );
}
