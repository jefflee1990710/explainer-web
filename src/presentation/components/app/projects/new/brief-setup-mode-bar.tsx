"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

export type BriefSetupMode = "quick" | "details";

// Segmented mode toggle at the top of the Create Video brief form:
// lets users switch between Simple Quick Setup (Content + Style + Character) and Full 4-Step Details Setup.
export function BriefSetupModeBar({
  mode,
  onChange,
  defaultsSummary,
  onOpenDetailsStep,
  onOpenTutorial,
  disabled,
}: {
  mode: BriefSetupMode;
  onChange: (next: BriefSetupMode) => void;
  defaultsSummary: string;
  onOpenDetailsStep?: () => void;
  onOpenTutorial?: () => void;
  disabled?: boolean;
}) {
  const { locale } = useI18n();

  const quickLabel =
    locale === "zh-Hant"
      ? "⚡ 快速建立 · Quick Setup"
      : locale === "zh-Hans"
        ? "⚡ 快速创建 · Quick Setup"
        : "⚡ Quick Setup";

  const detailsLabel =
    locale === "zh-Hant"
      ? "⚙️ 完整設定 · Full Details"
      : locale === "zh-Hans"
        ? "⚙️ 完整设置 · Full Details"
        : "⚙️ Full Details";

  const quickSub =
    locale === "zh-Hant"
      ? "只需填寫內容、選擇風格與角色即可一鍵生成；其他規格自動套用預設值。"
      : locale === "zh-Hans"
        ? "只需填写内容、选择风格与角色即可一键生成；其他规格自动套用默认值。"
        : "Just enter content, pick character & visual style, and generate. Other settings stay on defaults.";

  const detailsSub =
    locale === "zh-Hant"
      ? "完整 4 步進階設定：影片類型、導演指示（Step 02）、參考圖、語言聲線、畫面比例與手繪分鏡草稿。"
      : locale === "zh-Hans"
        ? "完整 4 步进阶设置：视频类型、导演指示（Step 02）、参考图、语言声线、画面比例与手绘分镜草稿。"
        : "Full 4-step setup: video type, instruction & references (Step 02), voice & specs, and storyboard drafts.";

  const customizeBtnLabel =
    locale === "zh-Hant"
      ? "調整進階規格 →"
      : locale === "zh-Hans"
        ? "调整进阶规格 →"
        : "Customize full setup →";

  return (
    <div
      data-tour-id="setup-mode-bar"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/12 bg-white px-4 py-3 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground sm:text-sm">
          {mode === "quick" ? quickSub : detailsSub}
        </p>
        {mode === "quick" && defaultsSummary ? (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{defaultsSummary}</span>
            {onOpenDetailsStep ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onOpenDetailsStep}
                className="cursor-pointer font-semibold text-accent-ink underline decoration-accent-ink/40 underline-offset-2 transition hover:text-accent disabled:opacity-50"
              >
                {customizeBtnLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onOpenTutorial ? (
          <button
            type="button"
            onClick={onOpenTutorial}
            title={
              locale === "zh-Hant"
                ? "查看操作教學導覽"
                : locale === "zh-Hans"
                  ? "查看操作教学导览"
                  : "Show guided tour"
            }
            aria-label="Show guided tour"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 bg-paper font-display text-xs font-bold text-muted transition hover:border-accent-ink hover:text-foreground"
          >
            ?
          </button>
        ) : null}
        <div
          role="tablist"
          aria-label="Setup mode"
          className="inline-flex shrink-0 items-center rounded-full border border-accent-ink/15 bg-paper p-1"
        >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "quick"}
          disabled={disabled}
          onClick={() => onChange("quick")}
          className={`cursor-pointer rounded-full px-3.5 py-1.5 font-display text-xs font-bold transition ${
            mode === "quick"
              ? "bg-accent-ink text-lime shadow-xs"
              : "text-muted hover:text-foreground"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {quickLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "details"}
          disabled={disabled}
          onClick={() => onChange("details")}
          className={`cursor-pointer rounded-full px-3.5 py-1.5 font-display text-xs font-bold transition ${
            mode === "details"
              ? "bg-accent-ink text-lime shadow-xs"
              : "text-muted hover:text-foreground"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {detailsLabel}
        </button>
        </div>
      </div>
    </div>
  );
}
