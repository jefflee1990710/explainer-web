"use client";

import type { VoLanguage } from "@/model/project";
import { useI18n } from "@/presentation/components/i18n-provider";
import { SampleScriptBar } from "@/presentation/components/app/projects/new/sample-script-bar";
import { TalkingHeadScriptField } from "@/presentation/components/app/projects/new/talking-head-script-field";

const QUICK_LANGUAGE_OPTIONS: ReadonlyArray<{
  id: VoLanguage;
  labelZhHant: string;
  labelZhHans: string;
  labelEn: string;
}> = [
  { id: "yue", labelZhHant: "廣東話", labelZhHans: "广东话", labelEn: "Cantonese" },
  { id: "zh", labelZhHant: "國語", labelZhHans: "普通话", labelEn: "Mandarin" },
  { id: "en", labelZhHant: "English", labelZhHans: "English", labelEn: "English" },
  { id: "ja", labelZhHant: "日本語", labelZhHans: "日本語", labelEn: "Japanese" },
];

// Compact script card on Quick Setup (after Video type). Step badge defaults to 02.
export function QuickScriptCard({
  step = "02",
  source,
  onSourceChange,
  talkingHead,
  spokenScript,
  onSpokenScriptChange,
  language,
  onLanguageChange,
  disabled,
}: {
  step?: string;
  source: string;
  onSourceChange: (value: string) => void;
  talkingHead: boolean;
  spokenScript: string;
  onSpokenScriptChange: (value: string) => void;
  language?: VoLanguage;
  onLanguageChange?: (value: VoLanguage) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();

  const quickHint = talkingHead
    ? locale === "zh-Hant"
      ? "講稿必填。導演指示選填，只寫語氣同場景，唔好同講稿相同。"
      : locale === "zh-Hans"
        ? "讲稿必填。导演指示选填，只写语气和场景，不要和讲稿相同。"
        : "Script to read is required. Director instruction is optional — tone and setting only, and not the same words."
    : locale === "zh-Hant"
      ? "導演指示／腳本為選填（可輸入主題、腳本，或點下方「範例腳本」填入；留空亦會由導演根據所選風格與角色自動規劃），揀好下方視覺風格與角色即可按右下角「開始製作」！"
      : locale === "zh-Hans"
        ? "导演指示／脚本为选填（可输入主题、脚本，或点下方“示例脚本”填入；留空也会由导演根据所选风格与角色自动规划），选好下方视觉风格与角色即可按右下角“开始制作”！"
        : "Director instruction / script is optional (enter a topic, click a sample script below, or leave blank to let the director plan from your chosen style and character), then click “Start”!";

  const directorNoteLabel = talkingHead
    ? t("brief.talkingHead.instructionTitle")
    : locale === "zh-Hant"
      ? "導演指示（場景／語氣／重點）"
      : locale === "zh-Hans"
        ? "导演指示（场景／语气／重点）"
        : "Director instruction (scene / tone / hook)";

  return (
    <div
      data-tour-id="instruction-card"
      className="rounded-2xl border-2 border-accent-ink bg-white p-4 shadow-[4px_4px_0_0_#12141c] sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-xs font-bold text-lime">
            {step}
          </span>
          <h3 className="font-display text-base font-bold text-foreground">
            {talkingHead ? t("brief.talkingHead.scriptTitle") : t("brief.section02.title")}
          </h3>
        </div>

        {language && onLanguageChange ? (
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-accent-ink/15 bg-paper p-0.5">
            <span className="px-2 text-[11px] font-medium text-muted">
              {locale === "zh-Hant" ? "語音：" : locale === "zh-Hans" ? "语音：" : "Voice:"}
            </span>
            {QUICK_LANGUAGE_OPTIONS.map((opt) => {
              const active = language === opt.id;
              const label =
                locale === "zh-Hant"
                  ? opt.labelZhHant
                  : locale === "zh-Hans"
                    ? opt.labelZhHans
                    : opt.labelEn;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onLanguageChange(opt.id)}
                  className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-accent-ink text-lime shadow-xs"
                      : "text-muted hover:text-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <p className="mt-1 text-xs leading-5 text-muted">{quickHint}</p>

      {talkingHead ? (
        /* Side-by-side 2-column layout when Talking-Head is active so both fields stay compact and 02/03 remain visible below */
        <div className="mt-3 grid gap-4 md:grid-cols-2 md:items-start">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="quick-source" className="text-sm font-semibold">
                {directorNoteLabel}
              </label>
              <span className="rounded-full bg-accent-ink/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted">
                {t("brief.source.charCount", { n: source.length.toLocaleString() })}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">
              {t("brief.talkingHead.instructionHint")}
            </p>
            <textarea
              id="quick-source"
              rows={3}
              value={source}
              onChange={(event) => onSourceChange(event.target.value)}
              disabled={disabled}
              placeholder={t("brief.talkingHead.instructionPlaceholder")}
              className="mt-2 min-h-[5.5rem] w-full resize-y rounded-2xl border border-accent-ink/20 bg-paper px-4 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </div>

          <TalkingHeadScriptField
            value={spokenScript}
            onChange={onSpokenScriptChange}
            disabled={disabled}
            compact
          />
        </div>
      ) : (
        <div className="mt-2.5">
          <label htmlFor="quick-source" className="sr-only">
            {t("brief.source.label")}
          </label>
          <textarea
            id="quick-source"
            rows={3}
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            disabled={disabled}
            placeholder={t("brief.source.placeholder")}
            className="min-h-[5.5rem] w-full resize-y rounded-2xl border border-accent-ink/20 bg-paper px-4 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <SampleScriptBar
          disabled={disabled}
          talkingHead={talkingHead}
          onApply={({ source: nextSource, spokenScript: nextSpoken }) => {
            onSourceChange(nextSource);
            if (nextSpoken !== undefined) onSpokenScriptChange(nextSpoken);
          }}
        />
        {!talkingHead ? (
          <span className="rounded-full bg-accent-ink/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted">
            {t("brief.source.charCount", { n: source.length.toLocaleString() })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
