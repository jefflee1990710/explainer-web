"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

const LONG_VALUE = 72;

// Read-only profile row. Long text stays clamped until the row is opened.
export function DirectorSpecRow({
  label,
  value,
  modified,
}: {
  label: string;
  value: string;
  modified: boolean;
}) {
  const { t } = useI18n();
  const text = value.trim();
  const long = text.length > LONG_VALUE;

  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-3 border-b border-accent-ink/8 py-1.5 last:border-0">
      <dt className="flex flex-wrap items-center gap-1 pt-0.5 text-[11px] font-semibold text-muted">
        <span>{label}</span>
        {modified ? (
          <span className="rounded-full bg-lime px-1.5 py-px text-[10px] font-bold text-accent-ink">
            {t("directors.modified")}
          </span>
        ) : null}
      </dt>
      <dd className="min-w-0 text-xs leading-5 text-[var(--studio-ink,#12141c)]">
        {long ? (
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
          <p title={text || undefined}>{text || t("directors.profileEmpty")}</p>
        )}
      </dd>
    </div>
  );
}
