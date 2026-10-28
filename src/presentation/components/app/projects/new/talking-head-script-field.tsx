"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Talking-head only: the exact lines the character reads on camera.
export function TalkingHeadScriptField({
  value,
  onChange,
  disabled,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={compact ? "" : "mt-5"}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{t("brief.talkingHead.scriptTitle")}</p>
        <span className="rounded-full bg-accent-ink/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted">
          {t("brief.source.charCount", { n: value.length.toLocaleString() })}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
        {t("brief.talkingHead.scriptHint")}
      </p>
      <label htmlFor="spokenScript" className="sr-only">
        {t("brief.talkingHead.scriptLabel")}
      </label>
      <textarea
        id="spokenScript"
        name="spokenScript"
        required
        rows={compact ? 3 : 6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`mt-2 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
          compact ? "min-h-[5.5rem]" : "min-h-[9rem]"
        }`}
        placeholder={t("brief.talkingHead.scriptPlaceholder")}
      />
    </div>
  );
}
