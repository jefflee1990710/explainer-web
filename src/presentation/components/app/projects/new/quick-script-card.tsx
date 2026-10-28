"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { SampleScriptBar } from "@/presentation/components/app/projects/new/sample-script-bar";
import { TalkingHeadScriptField } from "@/presentation/components/app/projects/new/talking-head-script-field";

// Compact top-of-page script & sample-prompt card on Quick Setup so 01 Instruction, 02 Visual Style, and 03 Characters all fit above the fold on 1 screen.
export function QuickScriptCard({
  source,
  onSourceChange,
  talkingHead,
  spokenScript,
  onSpokenScriptChange,
  prefilledFromFolder,
  disabled,
}: {
  source: string;
  onSourceChange: (value: string) => void;
  talkingHead: boolean;
  spokenScript: string;
  onSpokenScriptChange: (value: string) => void;
  prefilledFromFolder?: boolean;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();

  const quickHint =
    locale === "zh-Hant"
      ? "輸入一句話主題或完整腳本（或點下方「範例腳本」一鍵填入），再揀埋下方視覺風格與角色，即可直接按右下角「開始製作」！"
      : locale === "zh-Hans"
        ? "输入一句话主题或完整脚本（或点下方“示例脚本”一键填入），再选好下方视觉风格与角色，即可直接按右下角“开始制作”！"
        : "Enter your topic or full script (or click a sample script below), pick your visual style and character below, and click “Start” right away!";

  const prefilledBanner =
    locale === "zh-Hant"
      ? "✨ 已自動帶入你剛輸入的專案主題！可直接按右下角「產生分鏡」，或繼續補充細節。"
      : locale === "zh-Hans"
        ? "✨ 已自动带入你刚输入的项目主题！可直接按右下角“生成分镜”，或继续补充细节。"
        : "✨ Pre-filled from your project title! You can click “Generate Storyboard” right away or add more detail.";

  const directorNoteLabel =
    locale === "zh-Hant"
      ? "導演指示（場景／語氣／重點）"
      : locale === "zh-Hans"
        ? "导演指示（场景／语气／重点）"
        : "Director instruction (scene / tone / hook)";

  return (
    <div
      data-tour-id="instruction-card"
      className="rounded-2xl border-2 border-accent-ink bg-white p-4 shadow-[4px_4px_0_0_#12141c] sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-xs font-bold text-lime">
            01
          </span>
          <h3 className="font-display text-base font-bold text-foreground">
            {t("brief.section02.title")}
          </h3>
        </div>
        {prefilledFromFolder && source.trim().length > 0 ? (
          <span className="rounded-full bg-lime/35 px-3 py-1 text-xs font-semibold text-accent-ink">
            {prefilledBanner}
          </span>
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
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">
              {t("brief.talkingHead.hint")}
            </p>
            <textarea
              id="quick-source"
              rows={3}
              value={source}
              onChange={(event) => onSourceChange(event.target.value)}
              disabled={disabled}
              placeholder={t("brief.source.placeholder")}
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
          onApply={(text) => {
            onSourceChange(text);
            if (talkingHead && !spokenScript.trim()) {
              onSpokenScriptChange(text);
            }
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
