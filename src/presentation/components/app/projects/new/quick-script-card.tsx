"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { SampleScriptBar } from "@/presentation/components/app/projects/new/sample-script-bar";
import { TalkingHeadScriptField } from "@/presentation/components/app/projects/new/talking-head-script-field";

// Top-of-page script & sample-prompt card on Step 01 so users can type a topic and generate a storyboard in 1 page without hunting through 4 steps.
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

  return (
    <div
      data-tour-id="instruction-card"
      className="rounded-2xl border-2 border-accent-ink bg-white p-5 shadow-[4px_4px_0_0_#12141c] sm:p-6"
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
        <span className="rounded-full bg-lime/40 px-2.5 py-0.5 text-xs font-bold text-accent-ink">
          0 Credits · {t("brief.footer.noCharge")}
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-5 text-muted">{quickHint}</p>

      {prefilledFromFolder && source.trim().length > 0 ? (
        <p className="mt-2.5 rounded-xl bg-lime/30 px-3 py-2 text-xs font-semibold text-accent-ink">
          {prefilledBanner}
        </p>
      ) : null}

      <div className="mt-3">
        <label htmlFor="quick-source" className="sr-only">
          {t("brief.source.label")}
        </label>
        <textarea
          id="quick-source"
          rows={talkingHead ? 4 : 5}
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
          disabled={disabled}
          placeholder={t("brief.source.placeholder")}
          className="w-full resize-y rounded-2xl border border-accent-ink/20 bg-paper px-4 py-3 text-base leading-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
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
          <span className="rounded-full bg-accent-ink/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted">
            {t("brief.source.charCount", { n: source.length.toLocaleString() })}
          </span>
        </div>

        {talkingHead ? (
          <div className="mt-3">
            <TalkingHeadScriptField
              value={spokenScript}
              onChange={onSpokenScriptChange}
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
