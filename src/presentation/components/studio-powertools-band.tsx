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

// Highlights the 6 flagship studio capabilities across Landing & Feature pages:
// 1. 120s 1-Pass Lip-Sync + Direct Mic/Audio VO Upload + 21 Languages + Dialogue Q&A
// 2. Scro Swap (SAM 3 Multi-Person Motion Swap / 17-Look Relight) & Teleport Scene Relocation
// 3. Poster SAM 3 Studio (2K Social Posters + Person/Object/Text Element Inpainting)
// 4. Storyboard Sketchpad + Whiteboard & Paper Cutout 6-Diagram Explainers
// 5. OpenCut AI Audio (IG Viral SFX Peak-Aligned + BGM Loop & Auto-Ducking + Silence Trim)
// 6. 13 Artistic Captions + AI On-Screen Text Stickers + Drift-Free Root Wardrobe
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
        eyebrow: "全新升級 · 6 大 AI Studio 創作引擎",
        title: "由 120 秒一鏡到底口播、Scro Swap 換角換場、SAM 3 海報重繪到 AI 自動對拍剪輯，一站完成。",
        subtitle:
          "我們將虛擬 IP 經營、實拍影片改造與專業後期剪接全面整合進 Scro 工作台，讓你不用切換多個工具就能穩定日更爆款短片與海報。",
        cards: [
          {
            badge: "01 · 120s 對嘴口播 & 21 語原聲直出",
            title: "單段 120 秒 1080p 對嘴 + 雙人 Q&A + 原聲直傳",
            body: "支援單段最長 120 秒一鏡到底 1080p 自然對嘴（每秒僅 4 credits，已含語音），內建雙人對談 Q&A、雜誌人物專訪及口播穿插 B-Roll 導演；可跟著提詞稿用麥克風直錄或上傳原聲免 TTS 直出，支援廣東話等 21 國語言。",
            chips: ["120s 一鏡到底 (4 credits/s)", "雙人對談 Q&A & 專訪", "原聲直錄 / 21 國語言"],
          },
          {
            badge: "02 · Scro Swap 換角 & Teleport 換場",
            title: "SAM 3 多人影片換角、17 款電影打光與一鍵換場",
            body: "透過 SAM 3 RLE 像素級輪廓追蹤，在實拍或分鏡影片中實現 N 對 N 多人指定換角、換物換衫與 17 款電影級重新打光（Scro Swap），或鎖定原片人物動作與原聲嘴型一鍵搬入新場景（Teleport），並支援在 OpenCut 剪輯器內單鏡原地替換。",
            chips: ["SAM 3 多人影片換角", "17 款電影級打光", "Teleport 鎖動作換場"],
          },
          {
            badge: "03 · Poster Studio & SAM 3 局部重繪",
            title: "2K 社群海報生成 + 人物／物件／文字獨立重繪",
            body: "結合 Scro 角色穿搭與真實商品藍圖生成 2K 社群海報，並由 SAM 3 自動分離畫面中的「人物（Person）」、「物件（Object）」與「文字（Text）」三層輪廓，點選任意元素即可原位換人、換產品、改字或無縫移除。",
            chips: ["2K 品牌海報生成", "SAM 3 三層元素分離", "點選局部重繪 & 改字"],
          },
          {
            badge: "04 · 手繪分鏡畫板 & 結構化 Explainer",
            title: "白板塗鴉 + 剪紙拼貼 6 大圖表模型 + 先審畫格",
            body: "支援 Step 03 手繪分鏡草稿與 AI 對話室預先規劃，先審核 2K 關鍵畫格（4 credits/張）再渲染影片；內建白板手繪、Paper Cutout 剪紙拼貼（6 大結構化圖表模型）、清單盤點、對比卡與流程宣傳導演。",
            chips: ["白板 & 剪紙拼貼圖表", "手繪分鏡 & AI 對話室", "先審畫格省重試成本"],
          },
          {
            badge: "05 · IG 熱門 SFX 峰值對拍 & BGM 自動避人聲",
            title: "自動去頭尾靜音 + IG Viral SFX + BGM Auto-Ducking",
            body: "OpenCut 載入片段自動裁除頭尾死白；AI 自動偵測轉場切點、字卡彈出與畫面動作，匹配內建 12 款 IG Reels 熱門 SFX 與 ElevenLabs AI Foley（20ms RMS 峰值對齊），並為 BGM 自動循環鋪底及寫入避開人聲的 Auto-Ducking 音量曲線。",
            chips: ["12 款 IG 熱門 SFX 對拍", "BGM Auto-Ducking 避人聲", "自動去頭尾死白 & B-Roll"],
          },
          {
            badge: "06 · 13 款藝術字幕 + AI 字卡 + 換裝鎖臉",
            title: "原生藝術字幕、AI 透明底視覺字卡與 v1–v10 鎖臉",
            body: "一鍵生成 13 款可編輯藝術字幕（中英雙語 Google Fonts）及 AI 去背貼紙字卡（撕紙、霓虹、立體字），轉場自動置於字幕層之下絕不遮字；搭配原始五官錨定技術，連續換裝 10 代依然 100% 鎖定同一張臉。",
            chips: ["13 款藝術字幕 & AI 字卡", "字幕獨立特效 & 防遮擋轉場", "v1–v10 換裝零走樣"],
          },
        ] satisfies PowertoolCard[],
      }
    : {
        eyebrow: "New in Scro Studio · 6-in-1 Creator Engine",
        title: "120s lip-sync, Scro Swap, Teleport, SAM 3 Poster Studio, and AI peak-aligned editing in one workspace.",
        subtitle:
          "Six integrated studio engines take you from virtual IP creation and live-video character/scene swapping to viral post-production without switching tools.",
        cards: [
          {
            badge: "01 · 120s Lip-Sync & 21 Languages",
            title: "Up to 120s 1-pass 1080p talking-head + Dialogue Q&A",
            body: "Render up to 120-second continuous 1080p talking-head clips in one pass (just 4 credits/s, voice included). Includes Dialogue Q&A, Editorial Interview, and Talking B-Roll directors, plus direct mic/audio VO upload and 21 matched languages.",
            chips: ["120s 1-Pass (4 credits/s)", "Dialogue Q&A & Interview", "Direct VO Upload & 21 Languages"],
          },
          {
            badge: "02 · Scro Swap & Teleport",
            title: "SAM 3 multi-person motion swap, 17-look relight & scene teleport",
            body: "Use SAM 3 RLE pixel masks for N-to-N multi-person character swap, object/wardrobe replacement, and 17-look cinematic relighting (Scro Swap), or relocate your speaker into any new scene while preserving motion and lip-sync (Teleport) — standalone or right inside the OpenCut timeline.",
            chips: ["SAM 3 Multi-Person Swap", "17 Cinematic Light Looks", "Teleport Scene Relocation"],
          },
          {
            badge: "03 · Poster Studio & SAM 3 Inpainting",
            title: "2K social posters + Person / Object / Text element inpainting",
            body: "Generate 2K social posters with your AI Influencer and product blueprints, then let SAM 3 automatically segment every Person, Object, and Text layer so you can click any element to swap characters, replace products, edit copy, or erase cleanly.",
            chips: ["2K Poster Generation", "SAM 3 3-Layer Segmentation", "Click-to-Inpaint Elements"],
          },
          {
            badge: "04 · Storyboard Sketchpad & Explainers",
            title: "Whiteboard & Paper Cutout 6-diagram explainers + keyframe approval",
            body: "Sketch rough layouts or co-write scenes in AI chat and approve 2K keyframes (4 credits/image) before rendering video. Includes Whiteboard Doodle, Paper Cutout (6 structured diagram models), Listicle, Comparison Card, and Workflow Promo directors.",
            chips: ["Whiteboard & Paper Cutout", "Interactive Sketchpad", "Approve Keyframes First"],
          },
          {
            badge: "05 · IG Viral SFX & BGM Auto-Ducking",
            title: "Auto silence trim + peak-aligned IG Viral SFX + BGM ducking",
            body: "OpenCut trims leading/trailing dead air on load, aligns 12 curated IG Reels Viral SFX and ElevenLabs AI Foley peaks (20ms RMS) directly onto cuts and text pops, and loops BGM with automated volume ducking keyframes under spoken VO.",
            chips: ["12 IG Viral SFX Pack", "BGM Auto-Ducking Keyframes", "Auto Silence Trim & B-Roll"],
          },
          {
            badge: "06 · Artistic Captions, AI Cards & Face Lock",
            title: "13 caption styles, AI On-Screen Text stickers & drift-free wardrobe",
            body: "Generate editable subtitle tracks with 13 artistic presets, bilingual Google Fonts, and transparent AI On-Screen Text sticker plates (torn paper, neon, 3D) while root-anchored wardrobe edits keep facial identity 100% locked from v1 to v10.",
            chips: ["13 Captions & AI Text Cards", "Clip-Level Effects & Smart Transitions", "v1–v10 Face Lock"],
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

        <MotionStagger className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
