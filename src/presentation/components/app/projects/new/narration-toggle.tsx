"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Toggle switch to enable or disable voiceover narration (旁白) on the creation page.
export function NarrationToggle({
  value,
  hasCharacter,
  onChange,
  disabled,
}: {
  value: boolean;
  hasCharacter: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const hint = !value
    ? t("brief.narrationToggle.disabledHint")
    : hasCharacter
      ? t("brief.narrationToggle.characterVoiceHint")
      : t("brief.narrationToggle.enabledHint");

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-accent-ink/10 bg-paper/70 px-4 py-3">
      <div className="min-w-0">
        <p className="font-display text-sm font-bold text-foreground">
          {t("brief.narrationToggle.title")}
        </p>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={t("brief.narrationToggle.aria")}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
          value
            ? "border-accent-ink bg-accent-ink"
            : "border-accent-ink/20 bg-accent-ink/10"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform ${
            value
              ? "translate-x-6 bg-lime shadow-sm"
              : "translate-x-1 bg-white shadow-sm"
          }`}
        />
      </button>
    </div>
  );
}
