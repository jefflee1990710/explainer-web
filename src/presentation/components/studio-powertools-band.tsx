"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

type PowertoolCard = {
  badge: string;
  title: string;
  body: string;
  chips: string[];
};

// Highlights the 4 newly added studio capabilities across Landing & Feature pages:
// 1. Built-in Mic Voice Recorder + 21 Voiceover Languages
// 2. Storyboard Draft Sketchpad + AI Co-Director Chat
// 3. Auto Silence Trimming + Free Stock B-Roll Auto-Insert
// 4. Native Artistic Subtitles + Bilingual Google Fonts + Root-Locked Wardrobe
export function StudioPowertoolsBand({
  signedIn = false,
  tone = "light",
}: {
  signedIn?: boolean;
  tone?: "light" | "dark";
}) {
  const { locale, t } = useI18n();
  const isZh = locale.startsWith("zh");
  const isDark = tone === "dark";

  const copy = isZh
    ? {
        eyebrow: "全新升級 · Studio 創作引擎",
        title: "由麥克風錄音、手繪分鏡草稿到 AI 自動剪輯，一站完成。",
        subtitle:
          "我們將專業創作者最常卡關的 4 個環節全部內建進 Scro 工作台，讓你不用切換多個工具就能產出高留存短片。",
        cards: [
          {
            badge: "01 · 聲線複製 & 21 種語言",
            title: "瀏覽器麥克風直錄 + 21 國語言同步發聲",
            body: "免外接錄音軟體，直接跟著內建母語提詞稿（Teleprompter）用麥克風錄製 15 秒示範聲音，或上傳音訊檔；支援廣東話、國語、英、日、韓及歐美東南亞共 21 種語言同步建立角色聲線與生成短片。",
            chips: ["麥克風即時錄音", "內建 21 語提詞稿", "21 種語言配音同步"],
          },
          {
            badge: "02 · 分鏡草稿畫板 & AI 導演對話",
            title: "手繪構圖草稿 + AI 對話室逐段規劃",
            body: "在正式生成前，可在 Step 03 分鏡草稿自由新增 Clip、用畫筆手繪構圖位置並寫下畫面解說，或直接在右側 AI 對話室讓 AI 根據講稿自動拆解每段畫面與對白；留空則由 AI 導演全自動編排。",
            chips: ["手繪分鏡畫板", "AI 分鏡對話室", "支援留空全自動"],
          },
          {
            badge: "03 · 智能順暢剪接 & 免費 B-Roll",
            title: "自動切除句首句尾死白 + 一鍵穿插免費 B-Roll",
            body: "OpenCut 剪輯台載入片段時自動偵測音訊波形（RMS），精準裁走句首與句尾多餘空白並加上微淡入淡出，讓段與段之間零冷場；同時內建免費圖庫與影片搜尋，支援 AI 一鍵自動穿插 B-Roll 空鏡。",
            chips: ["自動去頭尾靜音", "零冷場順暢銜接", "免費 B-Roll 自動穿插"],
          },
          {
            badge: "04 · 藝術字體字幕 & 零走樣換裝",
            title: "13 款藝術字幕 + 中英雙語 Google Fonts + 換裝鎖臉",
            body: "直接將分鏡旁白轉為可編輯原生字幕軌，內建 13 款藝術字Preset（描邊、3D 陰影、霓虹發光、撕紙底條）與多款繁中／粵語 + 英文 Google Fonts；搭配原始五官錨定技術，連續換裝 10 代依然 100% 鎖定同一張臉。",
            chips: ["13 款藝術字幕", "中英雙語 Google Fonts", "v1–v10 換裝零走樣"],
          },
        ] satisfies PowertoolCard[],
      }
    : {
        eyebrow: "New in Scro Studio · Creator Engine",
        title: "From live mic voice cloning & sketchboards to AI auto-editing.",
        subtitle:
          "Four built-in studio upgrades remove the friction between your raw idea and a retention-ready vertical reel — all inside one workspace.",
        cards: [
          {
            badge: "01 · Mic Recording & 21 Languages",
            title: "In-browser mic recorder + 21 voiceover languages",
            body: "Record a 15-second voice sample right in your browser with built-in teleprompter scripts, or upload audio files. Clone your voice and generate videos across 21 matched languages including English, Cantonese, Mandarin, Japanese, Korean, Spanish, Indonesian, and more.",
            chips: ["Live Mic Recorder", "Built-in Teleprompter", "21 Matched Languages"],
          },
          {
            badge: "02 · Storyboard Sketchpad & AI Chat",
            title: "Draw rough layout sketches + co-write clips with AI",
            body: "In Step 03 Storyboard Drafts, add custom clips, sketch where characters and diagrams sit on a canvas, or chat with the AI assistant on the right to draft visual explanations and VO lines from your script — or leave it blank for full AI auto-planning.",
            chips: ["Interactive Sketchpad", "AI Draft Chatroom", "Optional Auto-Plan"],
          },
          {
            badge: "03 · Silence Trim & Free Stock B-Roll",
            title: "Auto dead-air removal + 1-click Stock B-Roll cutaways",
            body: "OpenCut analyzes audio RMS on load to trim leading and trailing dead air with smooth 15ms micro-fades so clips flow without awkward pauses. Search free stock photos & videos in-panel or click Auto Insert B-Roll to overlay cutaways automatically.",
            chips: ["Auto Silence Trim", "Seamless Clip Flow", "1-Click Stock B-Roll"],
          },
          {
            badge: "04 · Artistic Subtitles & Root Face Lock",
            title: "13 artistic caption styles, Google Fonts & drift-free wardrobe",
            body: "Generate editable native subtitle tracks from your VO in one click with 13 artistic presets (stroke, 3D shadow, neon glow, pill strips) and bilingual Google Fonts — while root-anchored wardrobe edits keep facial geometry 100% identical from v1 to v10.",
            chips: ["13 Artistic Captions", "Bilingual Google Fonts", "Drift-Free Wardrobe Lock"],
          },
        ] satisfies PowertoolCard[],
      };

  return (
    <section
      id="studio-powertools"
      className={
        isDark
          ? "w-full border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28"
          : "w-full border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28"
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p
            className={
              isDark
                ? "inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]"
                : "inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]"
            }
          >
            {copy.eyebrow}
          </p>
          <h2
            className={`mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl ${
              isDark ? "text-white" : "text-[#12141c]"
            }`}
          >
            {copy.title}
          </h2>
          <p
            className={`mt-4 text-base leading-7 ${
              isDark ? "text-white/70" : "text-[#5c6170]"
            }`}
          >
            {copy.subtitle}
          </p>
        </div>

        <MotionStagger className="mt-14 grid gap-6 md:grid-cols-2">
          {copy.cards.map((card) => (
            <MotionItem key={card.badge}>
              <article
                className={
                  isDark
                    ? "flex h-full flex-col justify-between rounded-2xl border border-white/12 bg-white/[0.04] p-7 transition-colors hover:border-[#c6f24b]/40"
                    : "flex h-full flex-col justify-between rounded-2xl border border-[#e4e4e7] bg-white p-7 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.06)]"
                }
              >
                <div>
                  <span
                    className={
                      isDark
                        ? "inline-flex items-center rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 px-3 py-1 text-xs font-bold text-[#c6f24b]"
                        : "inline-flex items-center rounded-full bg-[#12141c] px-3 py-1 text-xs font-bold text-[#c6f24b]"
                    }
                  >
                    {card.badge}
                  </span>
                  <h3
                    className={`mt-4 font-display text-xl font-semibold ${
                      isDark ? "text-white" : "text-[#12141c]"
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`mt-2.5 text-sm leading-6 ${
                      isDark ? "text-white/65" : "text-[#5c6170]"
                    }`}
                  >
                    {card.body}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 pt-2">
                  {card.chips.map((chip) => (
                    <span
                      key={chip}
                      className={
                        isDark
                          ? "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"
                          : "rounded-full border border-[#e4e4e7] bg-[#fafafa] px-3 py-1 text-xs font-medium text-[#12141c]"
                      }
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>

        <SectionCtaRow
          align="center"
          tone={isDark ? "dark" : "light"}
          primary={{
            href: signedIn ? "/app" : "/sign-up",
            label: signedIn ? t("landing.hero.ctaWorkspace") : t("landing.hero.ctaStart"),
          }}
          secondary={{ href: "/right-tool", label: t("nav.featuresRightTool") }}
        />
      </div>
    </section>
  );
}
