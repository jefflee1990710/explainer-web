"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Talking-head only: the exact lines the character reads on camera.
export function TalkingHeadScriptField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-6">
      <p className="text-sm font-semibold">{t("brief.talkingHead.scriptTitle")}</p>
      <p className="mt-1 text-xs text-muted">{t("brief.talkingHead.scriptHint")}</p>
      <label htmlFor="spokenScript" className="sr-only">
        {t("brief.talkingHead.scriptLabel")}
      </label>
      <textarea
        id="spokenScript"
        name="spokenScript"
        required
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-3 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-base leading-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        placeholder={t("brief.talkingHead.scriptPlaceholder")}
      />
      <p className="mt-2 text-right text-xs tabular-nums text-muted">
        {t("brief.source.charCount", { n: value.length.toLocaleString() })}
      </p>
    </div>
  );
}
