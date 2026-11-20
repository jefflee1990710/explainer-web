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
  const isZhHant = locale === "zh-Hant";
  const isZh = isZhHant || locale === "zh-Hans";
  const isDark = tone === "dark";

  const zhHantCopy = {
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
            body: "唔知點開始？喺畫布下方用廣東話、中文或英文話俾 AI 助理知你想整咩，佢會自動幫你揀啱工具、填好角色同排好成條流程（對話完全免費）。",
            chips: ["免費自然語言砌圖", "支援 6 種對話語言", "隨時一鍵 Undo"],
          },
          {
            badge: "06 · 2K 海報、生活照 & 角色庫",
            title: "一次鎖臉鎖聲，全平台內容保持 100% 一致",
            body: "結合你嘅鎖臉角色同商品圖庫，喺畫布隨時生成 2K 生活照、社群海報或最新頂級生圖與生片模型，所有背景執行關掉網頁都會自動完成。",
            chips: ["2K 海報與生活照", "多代換裝零走樣", "雲端背景自動跑完"],
          },
    ] satisfies PowertoolCard[],
  };

  const enCopy = {
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

  // Simplified Chinese mirror of the Cantonese copy (public site supports zh-Hant / zh-Hans / en).
  const zhHansCopy = {
    eyebrow: "SCRO CANVAS · 一站式 AI 媒体工作台",
    title: "从灵感、配音、出片、换角换场到自动合并混音，全部在同一块画布轻松完成。",
    subtitle:
      "不必面对复杂参数和零散工具。无论是单段口播还是多段串联工作流，拖放或对 AI 助理说一句，就能在云端自动完成。",
    cards: [
      {
        badge: "01 · 120 秒真人口播 & AI 配音",
        title: "输入讲稿或语音，一键生成自然对口型口播",
        body: "支持最长 120 秒 1080p 高清真人口播（$0.18/秒），并内置即时 AI 配音积木，支持粤语、国语与英语等 21 国语言和语速微调。",
        chips: ["120 秒 1080p 对口型", "粤语等 21 国配音", "语速自由微调"],
      },
      {
        badge: "02 · 视频换角 & 实景换场",
        title: "Scro Swap 换角换装 ＋ Teleport 一键换场",
        body: "直接把现有视频主角替换成你的专属 AI 角色或自订穿搭，并套用 17 款电影打光；或保留原片人物与嘴型动作，一键搬进全新场景。",
        chips: ["保留动作与光影", "17 款电影打光", "锁住人物一键换场"],
      },
      {
        badge: "03 · AI 解说动画短视频",
        title: "白板手绘、剪纸拼贴与 3D 折纸解说",
        body: "输入主题或笔记，自动规划多段视觉图表、艺术标题字卡与流畅旁白，并全自动合并成完整短视频，适合知识分享与产品教学。",
        chips: ["白板／剪纸／折纸风格", "自动画出图表字卡", "多段全自动合片"],
      },
      {
        badge: "04 · 自动合并剪辑 & 混音",
        title: "多段无缝串联、自动配音混音与比例裁切",
        body: "在画布直接把多条视频自动合并（支持淡入淡出转场），把 AI 旁白或背景音乐自动混入并压低原声，一键裁切 9:16／16:9／1:1。",
        chips: ["最多 8 段视频串联", "自动压低背景音", "一键 9:16／16:9"],
      },
      {
        badge: "05 · 免费 Canvas AI 助理",
        title: "打字说出想法，AI 帮你自动搭好整条流程",
        body: "不知道怎样开始？在画布下方用粤语、中文或英文对 AI 助理说出你想做什么，它会自动帮你选好工具、填好角色并排好整条流程（对话完全免费）。",
        chips: ["免费自然语言搭建", "支持 6 种对话语言", "随时一键 Undo"],
      },
      {
        badge: "06 · 2K 海报、生活照 & 角色库",
        title: "一次锁脸锁声，全平台内容保持 100% 一致",
        body: "结合你的锁脸角色与商品图库，在画布随时生成 2K 生活照、社群海报或最新顶级生图与生片模型，所有后台执行关掉网页也会自动完成。",
        chips: ["2K 海报与生活照", "多代换装零走样", "云端后台自动跑完"],
      },
    ],
  };

  const copy =
    locale === "zh-Hant" ? zhHantCopy : locale === "zh-Hans" ? zhHansCopy : enCopy;

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
