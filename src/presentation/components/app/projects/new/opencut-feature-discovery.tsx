"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";

const OPENCUT_TUTORIAL_DONT_SHOW_KEY =
  "scro:opencut-editor-feature-discovery:dont-show:v1";

export type OpenCutDiscoveryStep = {
  id: string;
  targetSelector: string;
  fallbackSelector?: string;
  groupLabel: string;
  title: string;
  body: string;
};

type TargetRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

// Returns true ONLY if the user explicitly checked "Don't show again".
export function hasSeenOpenCutTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(OPENCUT_TUTORIAL_DONT_SHOW_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOpenCutTutorialDontShow(dontShow: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (dontShow) {
      window.localStorage.setItem(OPENCUT_TUTORIAL_DONT_SHOW_KEY, "1");
    } else {
      window.localStorage.removeItem(OPENCUT_TUTORIAL_DONT_SHOW_KEY);
    }
  } catch {
    // Ignore storage quota errors.
  }
}

// Feature Discovery spotlight tutorial overlay for the OpenCut video editor page:
// 1. Introduces each button in the top-right header bar
// 2. Introduces each of the 4 main OpenCut workspace sections (Left, Middle, Right, Bottom Track Timeline)
// 3. Introduces each button on the left-side tool rail (Media, Stock B-Roll, Subtitles, SFX, BGM, Stickers, Effects, Transitions, Adjustment, Settings)
export function OpenCutFeatureDiscovery({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const maskId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() =>
    typeof window !== "undefined" ? hasSeenOpenCutTutorial() : false,
  );
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });

  const allSteps: OpenCutDiscoveryStep[] = useMemo(() => {
    if (locale === "zh-Hant" || locale === "zh-Hans") {
      return [
        // ── Part 1: Top-Right Header Buttons ──
        {
          id: "header-tasks",
          targetSelector: '[data-opencut-tour="header-tasks"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "生成任務進度 · Task Queue",
          body: "顯示目前正在排隊或產生中嘅分鏡畫格與 AI 影片數量，點擊可查看即時進度。",
        },
        {
          id: "header-locks",
          targetSelector: '[data-opencut-tour="header-locks"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "道具與 3×3 場景鎖 · Scene & Prop Locks",
          body: "查看呢支影片共用嘅道具參考表（Prop Sheet）與 3×3 多角度空景底板，確保跨鏡頭視覺一致。",
        },
        {
          id: "header-captions",
          targetSelector: '[data-opencut-tour="header-captions"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "社交平台文案 · Share Captions",
          body: "一鍵為 IG Reels、YouTube Shorts 及 TikTok 自動撰寫吸睛貼文文案與 Hashtags。",
        },
        {
          id: "header-finish-missing",
          targetSelector: '[data-opencut-tour="header-finish-missing"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "補齊未完成項目 · Finish Missing",
          body: "自動偵測並一鍵補齊所有尚未產生嘅場景圖或片段影片。",
        },
        {
          id: "header-all-videos",
          targetSelector: '[data-opencut-tour="header-all-videos"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "產生全部影片 · Generate All Videos",
          body: "當分鏡畫格準備好後，撳呢度即可一次過將所有分鏡轉成 AI 動態影片。",
        },
        {
          id: "header-add-clip",
          targetSelector: '[data-opencut-tour="header-add-clip"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "新增分鏡片段 · Add Clip",
          body: "喺現有分鏡後面追加新嘅 Clip 段落，擴充你嘅影片內容。",
        },
        {
          id: "header-export-video",
          targetSelector: '[data-opencut-tour="header-export-video"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "匯出成片 · Export Video",
          body: "將時間軸上嘅影片、雙色字幕、B-Roll、音效與背景音樂合成並下載高清 MP4 成片。",
        },
        {
          id: "header-more",
          targetSelector: '[data-opencut-tour="header-more"]',
          fallbackSelector: '[data-opencut-tour="top-right-bar"]',
          groupLabel: "右上角工具列 · Top Right",
          title: "更多操作與重新開始 · More & Restart",
          body: "提供重新開始（修改導演指示重寫分鏡）或刪除此影片等管理選項。",
        },

        // ── Part 2: Four Main OpenCut Sections ──
        {
          id: "section-left",
          targetSelector: '[data-opencut-tour="section-left-assets"]',
          groupLabel: "四大工作區 · Editor Sections",
          title: "左側：素材與字幕庫 · Left Assets Panel",
          body: "管理所有分鏡片段、生成雙色字幕、搜尋免費 B-Roll 插圖、音效（SFX）、背景音樂（BGM）、貼紙及轉場效果。",
        },
        {
          id: "section-middle",
          targetSelector: '[data-opencut-tour="section-middle-preview"]',
          groupLabel: "四大工作區 · Editor Sections",
          title: "中間：即時預覽畫布 · Center Preview Canvas",
          body: "即時播放與預覽影片效果！你可以直接喺畫面上面拖拉字幕調整上下位置，或雙擊文字即時修改內容。",
        },
        {
          id: "section-right",
          targetSelector: '[data-opencut-tour="section-right-inspector"]',
          groupLabel: "四大工作區 · Editor Sections",
          title: "右側：屬性與 AI 修改器 · Right Inspector",
          body: "點選時間軸上嘅 Clip 可用 AI 修改畫面或重畫畫格；點選字幕則會顯示「字幕圖層全軌控制」，一次過改字體、大小、底條形狀同雙色配色！",
        },
        {
          id: "section-bottom",
          targetSelector: '[data-opencut-tour="section-bottom-timeline"]',
          groupLabel: "四大工作區 · Editor Sections",
          title: "底部：多軌時間軸 · Bottom Track Timeline",
          body: "自由剪接、分割、調整片段長度，並設有專屬「字幕圖層」（點擊左側「字幕圖層」標籤即可一鍵全選所有字幕）。",
        },

        // ── Part 3: Left Rail Buttons (9+1 icons in image order) ──
        {
          id: "rail-media",
          targetSelector: '[data-opencut-tour="rail-media"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (1/9)",
          title: "1. 分鏡與媒體庫 · Media",
          body: "顯示呢支影片嘅所有分鏡（Clip 1, Clip 2...）、上傳你嘅自訂圖片／影片，或插入片頭片尾（Bookends）。",
        },
        {
          id: "rail-stock",
          targetSelector: '[data-opencut-tour="rail-stock"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (2/9)",
          title: "2. 免費插圖與影片素材 · Stock B-Roll",
          body: "輸入關鍵字搜尋免費高清插圖與 B-Roll 影片，或一鍵由 AI 自動根據對白喺時間軸插入 B-Roll！",
        },
        {
          id: "rail-subtitles",
          targetSelector: '[data-opencut-tour="rail-subtitles"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (3/10)",
          title: "3. AI 雙色與單行字幕 · Subtitles",
          body: "搜尋中英字體並揀選超過 60 款單行／雙行撞色字幕設計（如撕紙雙色、筆刷重點、圓角膠囊），一鍵自動對齊旁白生成字幕圖層！",
        },
        {
          id: "rail-on-screen-text",
          targetSelector: '[data-opencut-tour="rail-on-screen-text"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (4/10)",
          title: "4. AI 畫面文字圖片 · On-Screen Text",
          body: "點選 AI 字幕圖片樣式並輸入自訂文字，即時生成透明底 AI 字幕圖卡並插入時間軸。",
        },
        {
          id: "rail-sounds",
          targetSelector: '[data-opencut-tour="rail-sounds"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (4/9)",
          title: "4. 音效庫 · SFX (Sound Effects)",
          body: "搜尋並加入轉場嗖聲、彈出提示音、環境音效等，令影片節奏更生動。",
        },
        {
          id: "rail-bgm",
          targetSelector: '[data-opencut-tour="rail-bgm"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (5/9)",
          title: "5. 背景音樂 · BGM",
          body: "揀選唔同風格嘅免版權背景音樂（Ambient、Upbeat、Cinematic 等），一鍵鋪滿時間軸底樂。",
        },
        {
          id: "rail-stickers",
          targetSelector: '[data-opencut-tour="rail-stickers"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (6/9)",
          title: "6. 動態貼紙與圖標 · Stickers",
          body: "搜尋並加入趣味貼紙、箭嘴、表情符號與視覺標記到畫面中。",
        },
        {
          id: "rail-effects",
          targetSelector: '[data-opencut-tour="rail-effects"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (7/9)",
          title: "7. 視覺特效 · Effects",
          body: "為片段套用模糊、復古、故障（Glitch）、光暈等視覺濾鏡特效。",
        },
        {
          id: "rail-transitions",
          targetSelector: '[data-opencut-tour="rail-transitions"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (8/9)",
          title: "8. 轉場動畫 · Transitions",
          body: "喺兩個 Clip 之間加入平滑淡入淡出、滑動、縮放等轉場銜接效果。",
        },
        {
          id: "rail-adjustment",
          targetSelector: '[data-opencut-tour="rail-adjustment"]',
          fallbackSelector: '[data-opencut-tour="left-rail"]',
          groupLabel: "左側工具欄 · Left Rail (9/9)",
          title: "9. 調色與專案設定 · Adjustment & Settings",
          body: "調整畫面色彩參數，或喺下方齒輪（Settings）修改畫布背景顏色、模糊底圖與畫面比例。",
        },
      ];
    }

    return [
      {
        id: "header-tasks",
        targetSelector: '[data-opencut-tour="header-tasks"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Generation Task Queue",
        body: "Shows how many scene frames or clip videos are currently queued or rendering in the background.",
      },
      {
        id: "header-locks",
        targetSelector: '[data-opencut-tour="header-locks"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Prop Sheet & 3×3 Set Locks",
        body: "Inspect the shared prop reference sheet and 3×3 multi-angle background plates that keep every clip consistent.",
      },
      {
        id: "header-captions",
        targetSelector: '[data-opencut-tour="header-captions"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Social Share Captions",
        body: "Generate ready-to-post captions and hashtags for Instagram Reels, YouTube Shorts, and TikTok.",
      },
      {
        id: "header-finish-missing",
        targetSelector: '[data-opencut-tour="header-finish-missing"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Finish Missing Items",
        body: "Automatically generate any remaining missing scene frames or clip videos in one click.",
      },
      {
        id: "header-all-videos",
        targetSelector: '[data-opencut-tour="header-all-videos"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Generate All Clip Videos",
        body: "Once your scene frames are ready, click here to render all storyboard clips into AI videos at once.",
      },
      {
        id: "header-add-clip",
        targetSelector: '[data-opencut-tour="header-add-clip"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Add New Clip",
        body: "Append a new storyboard clip to extend your video.",
      },
      {
        id: "header-export-video",
        targetSelector: '[data-opencut-tour="header-export-video"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Export Final MP4 Video",
        body: "Render and download your finished MP4 video with all clips, subtitles, B-roll, SFX, and BGM.",
      },
      {
        id: "header-more",
        targetSelector: '[data-opencut-tour="header-more"]',
        fallbackSelector: '[data-opencut-tour="top-right-bar"]',
        groupLabel: "Top Right Header",
        title: "Start Over & More Menu",
        body: "Re-open the brief to start over or delete this video project.",
      },
      {
        id: "section-left",
        targetSelector: '[data-opencut-tour="section-left-assets"]',
        groupLabel: "Editor Workspace (1/4)",
        title: "Left Panel: Assets & Subtitles",
        body: "Browse storyboard clips, generate stylized subtitles, and add stock B-roll, SFX, BGM, stickers, and transitions.",
      },
      {
        id: "section-middle",
        targetSelector: '[data-opencut-tour="section-middle-preview"]',
        groupLabel: "Editor Workspace (2/4)",
        title: "Center Panel: Live Preview Canvas",
        body: "Play back your edit in real time. Drag any subtitle on the canvas to move the entire subtitle track up or down, or double-click to edit text.",
      },
      {
        id: "section-right",
        targetSelector: '[data-opencut-tour="section-right-inspector"]',
        groupLabel: "Editor Workspace (3/4)",
        title: "Right Panel: Inspector & Track Controls",
        body: "Select a video clip to redraw frames or edit with AI; select a subtitle to batch-edit font, size, strip shape, vertical position, and dual colors.",
      },
      {
        id: "section-bottom",
        targetSelector: '[data-opencut-tour="section-bottom-timeline"]',
        groupLabel: "Editor Workspace (4/4)",
        title: "Bottom Panel: Multi-Track Timeline",
        body: "Trim, split, and arrange clips across video, audio, and the dedicated Subtitles Track.",
      },
      {
        id: "rail-media",
        targetSelector: '[data-opencut-tour="rail-media"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (1/9)",
        title: "1. Media & Storyboard Clips",
        body: "View your storyboard clips (Clip 1, Clip 2...), upload custom media, or add intro/outro bookends.",
      },
      {
        id: "rail-stock",
        targetSelector: '[data-opencut-tour="rail-stock"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (2/9)",
        title: "2. Stock B-Roll Media",
        body: "Search free stock photos and videos, or auto-insert B-roll matched to your voiceover.",
      },
      {
        id: "rail-subtitles",
        targetSelector: '[data-opencut-tour="rail-subtitles"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (3/10)",
        title: "3. Subtitles Generator",
        body: "Search bilingual fonts and pick from 65+ single-line and dual-line subtitle styles (like Torn Paper Duo) to auto-generate captions.",
      },
      {
        id: "rail-on-screen-text",
        targetSelector: '[data-opencut-tour="rail-on-screen-text"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (4/10)",
        title: "4. AI On-Screen Text",
        body: "Pick an AI subtitle style image card, type your custom text in the dialog, and generate an AI text graphic onto the timeline.",
      },
      {
        id: "rail-sounds",
        targetSelector: '[data-opencut-tour="rail-sounds"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (4/9)",
        title: "4. Sound Effects (SFX)",
        body: "Search and drop whooshes, pops, and Foley sound effects onto your timeline.",
      },
      {
        id: "rail-bgm",
        targetSelector: '[data-opencut-tour="rail-bgm"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (5/9)",
        title: "5. Background Music (BGM)",
        body: "Browse royalty-free background music tracks by mood and add them to your video.",
      },
      {
        id: "rail-stickers",
        targetSelector: '[data-opencut-tour="rail-stickers"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (6/9)",
        title: "6. Stickers & Icons",
        body: "Add expressive stickers, arrows, and callout graphics to your scene.",
      },
      {
        id: "rail-effects",
        targetSelector: '[data-opencut-tour="rail-effects"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (7/9)",
        title: "7. Visual Effects",
        body: "Apply visual filters, blur, glow, and glitch effects to clips.",
      },
      {
        id: "rail-transitions",
        targetSelector: '[data-opencut-tour="rail-transitions"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (8/9)",
        title: "8. Transitions",
        body: "Add smooth fades, slides, and wipes between adjacent clips.",
      },
      {
        id: "rail-adjustment",
        targetSelector: '[data-opencut-tour="rail-adjustment"]',
        fallbackSelector: '[data-opencut-tour="left-rail"]',
        groupLabel: "Left Tool Rail (9/9)",
        title: "9. Adjustment & Canvas Settings",
        body: "Fine-tune color adjustments or click the gear icon below to configure canvas background and aspect ratio.",
      },
    ];
  }, [locale]);

  // Filter steps whose target element is actually mounted and visible in the DOM
  const activeSteps = useMemo(() => {
    if (!open || typeof document === "undefined") return allSteps;
    const filtered = allSteps.filter((step) => {
      const el =
        document.querySelector(step.targetSelector) ??
        (step.fallbackSelector ? document.querySelector(step.fallbackSelector) : null);
      if (!el) return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    });
    return filtered.length > 0 ? filtered : allSteps;
  }, [open, allSteps]);

  const safeIndex = Math.min(stepIndex, Math.max(0, activeSteps.length - 1));
  const activeStep = activeSteps[safeIndex] ?? activeSteps[0]!;

  useLayoutEffect(() => {
    if (!open) return;

    function measure() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ width: vw, height: vh });

      const el =
        document.querySelector(activeStep.targetSelector) ??
        (activeStep.fallbackSelector
          ? document.querySelector(activeStep.fallbackSelector)
          : null);
      if (!el) {
        setRect(null);
        return;
      }
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) {
        setRect(null);
        return;
      }
      const pad = 6;
      setRect({
        left: Math.max(2, b.left - pad),
        top: Math.max(2, b.top - pad),
        width: Math.min(vw - 4, b.width + pad * 2),
        height: Math.min(vh - 4, b.height + pad * 2),
        cx: b.left + b.width / 2,
        cy: b.top + b.height / 2,
      });
    }

    measure();
    const timer = window.setTimeout(measure, 160);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, activeStep, safeIndex]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setStepIndex(0);
        setOpenCutTutorialDontShow(dontShowAgain);
        onClose();
      } else if (event.key === "ArrowRight" || event.key === "Enter") {
        if (safeIndex < activeSteps.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          setStepIndex(0);
          setOpenCutTutorialDontShow(dontShowAgain);
          onClose();
        }
      } else if (event.key === "ArrowLeft" && safeIndex > 0) {
        setStepIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, safeIndex, activeSteps.length, dontShowAgain, onClose]);

  if (!open || typeof document === "undefined") return null;

  const finish = () => {
    setStepIndex(0);
    setOpenCutTutorialDontShow(dontShowAgain);
    onClose();
  };

  const next = () => {
    if (safeIndex < activeSteps.length - 1) {
      setStepIndex(safeIndex + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (safeIndex > 0) setStepIndex(safeIndex - 1);
  };

  const cx = rect ? rect.cx : viewport.width / 2;
  const cy = rect ? rect.cy : viewport.height / 2;
  const isLargeSection = Boolean(rect && (rect.width > 240 || rect.height > 200));
  const outerRadius = isLargeSection
    ? Math.min(540, Math.max(rect!.width, rect!.height) * 0.72 + 120)
    : 360;

  // Smart card placement so the callout never covers the highlighted target
  const cardWidth = Math.min(370, viewport.width - 32);
  const cardHeight = 235;
  let cardLeft = Math.max(
    16,
    Math.min(cx - cardWidth / 2, viewport.width - cardWidth - 16),
  );
  let cardTop = viewport.height / 2 - cardHeight / 2;

  if (rect) {
    // If target is on the left rail (x < 120), place callout to the right of the rail
    if (rect.left < 120 && rect.width < 80) {
      cardLeft = Math.min(rect.left + rect.width + 24, viewport.width - cardWidth - 16);
      cardTop = Math.max(
        16,
        Math.min(cy - cardHeight / 2, viewport.height - cardHeight - 16),
      );
    } else if (rect.top + rect.height + cardHeight + 28 < viewport.height) {
      // Place below target
      cardTop = rect.top + rect.height + 20;
    } else if (rect.top - cardHeight - 20 > 12) {
      // Place above target
      cardTop = rect.top - cardHeight - 20;
    } else if (rect.left + rect.width + cardWidth + 24 < viewport.width) {
      // Place to the right of a large panel
      cardLeft = rect.left + rect.width + 20;
      cardTop = Math.max(
        16,
        Math.min(cy - cardHeight / 2, viewport.height - cardHeight - 16),
      );
    } else if (rect.left - cardWidth - 20 > 12) {
      // Place to the left of a large panel
      cardLeft = rect.left - cardWidth - 20;
      cardTop = Math.max(
        16,
        Math.min(cy - cardHeight / 2, viewport.height - cardHeight - 16),
      );
    } else {
      // Fallback inside bottom-right of viewport
      cardTop = Math.max(16, viewport.height - cardHeight - 24);
    }
  }

  const skipLabel =
    locale === "zh-Hant" ? "跳過導覽" : locale === "zh-Hans" ? "跳过导览" : "Skip";
  const prevLabel =
    locale === "zh-Hant" ? "上一步" : locale === "zh-Hans" ? "上一步" : "Back";
  const nextLabel =
    safeIndex < activeSteps.length - 1
      ? locale === "zh-Hant"
        ? "下一步 →"
        : locale === "zh-Hans"
          ? "下一步 →"
          : "Next →"
      : locale === "zh-Hant"
        ? "開始剪片 ✓"
        : locale === "zh-Hans"
          ? "开始剪辑 ✓"
          : "Start Editing ✓";
  const dontShowLabel =
    locale === "zh-Hant"
      ? "不再顯示 · Don't show again"
      : locale === "zh-Hans"
        ? "不再显示 · Don't show again"
        : "Don't show again";

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[260] select-none overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={activeStep.title}
      >
        <svg
          className="pointer-events-auto absolute inset-0 h-full w-full"
          width={viewport.width}
          height={viewport.height}
          onClick={next}
        >
          <defs>
            <mask id={maskId}>
              <rect
                x="0"
                y="0"
                width={viewport.width}
                height={viewport.height}
                fill="white"
              />
              {rect ? (
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx="14"
                  fill="black"
                />
              ) : null}
            </mask>
          </defs>

          {/* Dimmed backdrop */}
          <rect
            x="0"
            y="0"
            width={viewport.width}
            height={viewport.height}
            fill="rgba(18, 20, 28, 0.72)"
            mask={`url(#${maskId})`}
          />

          {/* Feature Discovery Concentric Expanding Circle */}
          <motion.circle
            key={`halo-${activeStep.id}`}
            initial={{ r: 60, opacity: 0 }}
            animate={{ r: outerRadius, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            cx={cx}
            cy={cy}
            fill="rgba(198, 242, 75, 0.15)"
            stroke="rgba(198, 242, 75, 0.55)"
            strokeWidth="2"
            mask={`url(#${maskId})`}
          />

          {/* Pulsing highlight ring around target */}
          {rect ? (
            <motion.rect
              key={`ring-${activeStep.id}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: [0.95, 0.45, 0.95], scale: [1, 1.01, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              x={rect.left - 2}
              y={rect.top - 2}
              width={rect.width + 4}
              height={rect.height + 4}
              rx="16"
              fill="none"
              stroke="#c6f24b"
              strokeWidth="3"
            />
          ) : null}
        </svg>

        {/* Callout Card */}
        <motion.div
          key={`card-${activeStep.id}`}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{
            left: `${cardLeft}px`,
            top: `${cardTop}px`,
            width: `${cardWidth}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute rounded-3xl border-2 border-[#c6f24b] bg-[#12141c] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-[#c6f24b] px-2.5 py-0.5 font-display text-[11px] font-bold text-[#12141c]">
              {activeStep.groupLabel}
            </span>
            <span className="font-mono text-xs font-bold text-white/70">
              {safeIndex + 1} / {activeSteps.length}
            </span>
          </div>

          <h3 className="mt-2.5 font-display text-base font-bold text-[#c6f24b] sm:text-lg">
            {activeStep.title}
          </h3>
          <p className="mt-1.5 text-xs leading-5 text-white/90 sm:text-sm">
            {activeStep.body}
          </p>

          {/* Don't show again checkbox */}
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-white/80 transition hover:text-white">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                setDontShowAgain(checked);
                setOpenCutTutorialDontShow(checked);
              }}
              className="h-3.5 w-3.5 cursor-pointer rounded border-white/40 accent-[#c6f24b]"
            />
            <span>{dontShowLabel}</span>
          </label>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-3">
            <button
              type="button"
              onClick={finish}
              className="cursor-pointer text-xs font-semibold text-white/65 transition hover:text-white"
            >
              {skipLabel}
            </button>

            <div className="flex items-center gap-2">
              {safeIndex > 0 ? (
                <button
                  type="button"
                  onClick={prev}
                  className="inline-flex h-8 cursor-pointer items-center rounded-full border border-white/25 px-3 text-xs font-bold text-white transition hover:border-white"
                >
                  {prevLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={next}
                className="inline-flex h-8 cursor-pointer items-center rounded-full bg-[#c6f24b] px-4 font-display text-xs font-bold text-[#12141c] shadow-[2px_2px_0_0_#ffffff] transition hover:-translate-y-0.5"
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
