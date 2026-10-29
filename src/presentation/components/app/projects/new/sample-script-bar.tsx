"use client";

import { track } from "@/presentation/components/analytics/track";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  SAMPLE_PRESETS,
  sampleApplyFor,
  type SampleApply,
} from "@/presentation/components/app/projects/new/sample-script-presets";

export type { SampleApply };

// One-click sample script pills so new users can test storyboard generation without writer's block.
export function SampleScriptBar({
  disabled,
  talkingHead,
  onApply,
}: {
  disabled?: boolean;
  talkingHead?: boolean;
  onApply: (sample: SampleApply) => void;
}) {
  const { locale } = useI18n();

  const prefixLabel = talkingHead
    ? locale === "zh-Hant"
      ? "沒有靈感？試下範例劇本，導演指示同講稿會分別帶入："
      : locale === "zh-Hans"
        ? "没有灵感？试试范例剧本，导演指示和讲稿会分别填入："
        : "Need inspiration? Try a sample script — director note and script to read stay different:"
    : locale === "zh-Hant"
      ? "沒有靈感？一鍵帶入範例劇本："
      : locale === "zh-Hans"
        ? "没有灵感？一键带入范例剧本："
        : "Need inspiration? Try a sample script:";

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted">{prefixLabel}</span>
      {SAMPLE_PRESETS.map((preset) => {
        const label =
          locale === "zh-Hant"
            ? preset.labelZhHant
            : locale === "zh-Hans"
              ? preset.labelZhHans
              : preset.labelEn;
        const sample = sampleApplyFor(preset, locale, Boolean(talkingHead));
        return (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              track("sample_script_applied", {
                preset_id: preset.id,
                talking_head: Boolean(talkingHead),
              });
              onApply(sample);
            }}
            data-talking-head={talkingHead ? "true" : undefined}
            className="inline-flex cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-3 py-1 text-xs font-semibold text-foreground transition hover:border-accent-ink/35 hover:bg-accent-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
