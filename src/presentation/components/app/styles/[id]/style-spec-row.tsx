"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

const CANVAS_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const LONG_VALUE = 72;

// Read-only spec row. Full text expands; color always shows a swatch plus hex.
export function StyleSpecRow({
  label,
  value,
  modified,
  kind = "text",
}: {
  label: string;
  value: string;
  modified: boolean;
  kind?: "text" | "color";
}) {
  const { t } = useI18n();
  const text = value.trim();
  const colorValid = CANVAS_COLOR_RE.test(text);
  const long = kind === "text" && text.length > LONG_VALUE;

  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-3 border-b border-accent-ink/8 py-1.5 last:border-0">
      <dt className="flex flex-wrap items-center gap-1 pt-0.5 text-[11px] font-semibold text-muted">
        <span>{label}</span>
        {modified ? (
          <span className="rounded-full bg-lime px-1.5 py-px text-[10px] font-bold text-accent-ink">
            {t("styles.modified")}
          </span>
        ) : null}
      </dt>
      <dd className="min-w-0 text-xs leading-5 text-[var(--studio-ink,#12141c)]">
        {kind === "color" ? (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-4 w-4 shrink-0 rounded-sm border border-accent-ink/15"
              style={{ backgroundColor: colorValid ? text : "transparent" }}
            />
            <span className="font-mono">{text || t("styles.fieldEmpty")}</span>
          </span>
        ) : long ? (
          <details>
            <summary
              title={text}
              className="cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden"
            >
              <span className="line-clamp-2 underline-offset-2 hover:underline">{text}</span>
            </summary>
            <p className="mt-1 whitespace-pre-wrap">{text}</p>
          </details>
        ) : (
          <p title={text || undefined}>{text || t("styles.fieldEmpty")}</p>
        )}
      </dd>
    </div>
  );
}
