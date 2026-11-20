"use client";

import { canvasLaunchHref } from "@/presentation/components/canvas-launch-href";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

type PowertoolCard = {
  badge: string;
  title: string;
  body: string;
  chips: string[];
};

// Highlights the 6 flagship Scro Canvas capabilities across Landing & Feature pages (zero technical jargon).
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
        eyebrow: "SCRO CANVAS · 一站式 AI 媒體工作台",
        title: "從靈感、配音、生片、換角換場到自動合併混音，全部喺同一塊畫布輕鬆完成。",
        subtitle:
          "唔使面對複雜參數同零散工具。無論係單段口播定多段串接工作流，拖放或問 AI 助理一句就可以自動在雲端完成。",
        cards: [
          {
            badge: "01 · 120 秒真人口播 & AI 配音",
            title: "輸入講稿或語音，一鍵生成自然對嘴口播",
            body: "支援最長 120 秒 1080p 高清真人口播（$0.18/秒），並內置即時 AI 配音積木，支援廣東話、國語同英文等 21 國語言與語速微調。",
            chips: ["120 秒 1080p 對嘴", "廣東話等 21 國配音", "語速自由微調"],
          },
          {
            badge: "02 · 影片換角 & 實景換場",
            title: "Scro Swap 換角換裝 ＋ Teleport 一鍵換場",
            body: "直接將現有影片主角替換成你嘅專屬 AI 角色或自訂穿搭，並套用 17 款電影打光；或者保留原片人物與嘴型動作，一鍵搬入全新場景。",
            chips: ["保留動作同光影", "17 款電影打光", "鎖住人物一鍵換場"],
          },
          {
            badge: "03 · AI 解說動畫短片",
            title: "白板手繪、剪紙拼貼與 3D 摺紙解說",
            body: "輸入主題或筆記，自動規劃多段視覺圖表、藝術標題字卡同流暢旁白，並全自動合併成完整短片，適合知識分享同產品教學。",
            chips: ["白板／剪紙／摺紙風格", "自動畫出圖表字卡", "多段全自動合片"],
          },
          {
            badge: "04 · 自動合併剪輯 & 混音",
            title: "多段無縫串接、自動配音混音與比例裁切",
            body: "喺畫布直接將多條影片自動合併（支援淡入淡出轉場），把 AI 旁白或背景音樂自動混入並壓低原聲，一鍵裁切 9:16／16:9／1:1。",
            chips: ["最多 8 段影片串接", "自動壓低背景音", "一鍵 9:16／16:9"],
          },
          {
            badge: "05 · 免費 Canvas AI 助理",
            title: "打字講出想法，AI 幫你自動砌好成條流程",
            body: "唔知點駁線？喺畫布下方用廣東話、中文或英文話俾 AI 助理知你想整咩，佢會自動幫你揀啱工具、填好角色同駁好線（對話完全免費）。",
            chips: ["免費自然語言砌圖", "支援 6 種對話語言", "隨時一鍵 Undo"],
          },
          {
            badge: "06 · 2K 海報、生活照 & 角色庫",
            title: "一次鎖臉鎖聲，全平台內容保持 100% 一致",
            body: "結合你嘅鎖臉角色同商品圖庫，喺畫布隨時生成 2K 生活照、社群海報或最新頂級生圖與生片模型，所有背景執行關掉網頁都會自動完成。",
            chips: ["2K 海報與生活照", "多代換裝零走樣", "雲端背景自動跑完"],
          },
        ] satisfies PowertoolCard[],
      }
    : {
        eyebrow: "SCRO CANVAS · ALL-IN-ONE CREATIVE WORKSPACE",
        title: "Voice, video, character swap, scene teleport, and auto-assembly on one simple canvas.",
        subtitle:
          "No technical hurdles or scattered tools. Start from a template or ask the free AI Assistant, then let our cloud pipeline render and merge everything automatically.",
        cards: [
          {
            badge: "01 · 120s Lip-Sync & AI Voice",
            title: "Up to 120s 1080p talking-head + instant AI voiceover",
            body: "Generate natural 1080p talking-head videos up to 120 seconds ($0.18/s), or pair any clip with instant AI voiceovers in 21 languages including Cantonese, Mandarin, and English.",
            chips: ["120s 1080p Lip-Sync", "21-Language AI Voice", "Adjustable Speech Pace"],
          },
          {
            badge: "02 · Character Swap & Teleport",
            title: "Swap performers or relocate anyone into a new scene",
            body: "Drop a reference clip to swap the person or outfit into your AI character with 17 cinematic lighting looks, or keep the speaker and move them into any new location.",
            chips: ["Motion & Light Lock", "17 Cinematic Looks", "1-Click Scene Teleport"],
          },
          {
            badge: "03 · Automated AI Explainers",
            title: "Whiteboard, paper cutout & 3D papercraft reels",
            body: "Turn any topic or article into a complete multi-scene animated explainer with crisp on-screen titles, diagrams, and synchronized voiceover—assembled automatically.",
            chips: ["3 Signature Visual Styles", "Auto Storyboard & Voice", "Ready-to-Post Reel"],
          },
          {
            badge: "04 · Auto-Merge, Mix & Resize",
            title: "Stitch clips, mix voiceover & format ratios effortlessly",
            body: "Join up to 8 clips with smooth transitions, blend voiceovers over background audio with automatic volume ducking, trim silence, and resize to 9:16, 16:9, or 1:1.",
            chips: ["Multi-Clip Auto Merge", "Auto Voice & Music Mix", "Instant Ratio Formatting"],
          },
          {
            badge: "05 · Free Canvas AI Assistant",
            title: "Just type what you want—AI builds the workflow for you",
            body: "Not sure which blocks to connect? Describe your goal in plain language right below the canvas and the AI Assistant wires the right tools and characters automatically for free.",
            chips: ["Free Workflow Builder", "6 Chat Languages", "Instant Undo"],
          },
          {
            badge: "06 · 2K Posters, Life Shots & IP Lock",
            title: "Consistent face, voice & product visuals across every run",
            body: "Drop your saved AI Influencer or product blueprints into any Canvas workflow to create 2K lifestyle shots, posters, and video clips—running reliably in the background.",
            chips: ["2K Posters & Life Shots", "Consistent Character IP", "Background Cloud Runs"],
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
            href: canvasLaunchHref(signedIn),
            label: isZh ? "免費進入 Scro Canvas" : "Open Scro Canvas",
          }}
          secondary={{ href: "/examples", label: t("nav.features") }}
        />
      </div>
    </section>
  );
}
