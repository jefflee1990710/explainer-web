"use client";

import { useEffect, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";

const TUTORIAL_STORAGE_KEY = "scro:create-video-feature-discovery:v1";

export type FeatureDiscoveryStep = {
  id: string;
  targetSelector: string;
  stepNumber: string;
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
  spotlightR: number;
};

export function hasSeenCreateVideoTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markCreateVideoTutorialSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    // Ignore storage quota errors.
  }
}

// Flutter `feature_discovery`-style concentric circle spotlight tutorial overlay for the Create Video page.
// Guides the user step-by-step through:
// 1. Quick Setup & Full Details mode toggle
// 2. Instruction field (content & director requirements)
// 3. Visual style selection
// 4. Character selection & inline character creation
export function CreateVideoFeatureDiscovery({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const maskId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });

  const steps: FeatureDiscoveryStep[] =
    locale === "zh-Hant"
      ? [
          {
            id: "mode",
            targetSelector: '[data-tour-id="setup-mode-bar"]',
            stepNumber: "1 / 4",
            title: "快速建立 vs 完整設定",
            body: "預設為「⚡ 快速建立（Quick Setup）」，只需填寫內容、選風格與角色即可一鍵生成；如需設定參考圖、語速、比例或手繪分鏡草稿，可隨時切換至「⚙️ 完整設定（Full Details）」。",
          },
          {
            id: "instruction",
            targetSelector: '[data-tour-id="instruction-card"]',
            stepNumber: "2 / 4",
            title: "填寫導演指示（Instruction）",
            body: "告訴 AI 導演你想拍咩內容、主題重點、語氣同埋特定畫面要求（或者直接貼上完整腳本，亦可以撳下方「範例腳本」一鍵填入）。",
          },
          {
            id: "style",
            targetSelector: '[data-tour-id="visual-style-card"]',
            stepNumber: "3 / 4",
            title: "選擇視覺風格（Visual Style）",
            body: "揀選分鏡圖與影片嘅畫風（例如寫實、白板塗鴉、剪紙拼貼、3D 動畫等），系統會自動篩選符合該畫風嘅角色。",
          },
          {
            id: "character",
            targetSelector: '[data-tour-id="character-card"]',
            stepNumber: "4 / 4",
            title: "選擇或即時建立角色（Characters）",
            body: "喺左邊下拉選單揀選現有角色或造型 Preset；如果想用新角色，直接撳右邊相連嘅「+ 新增」按鈕，即可上傳相片或用文字即時建立新角色並自動選取！",
          },
        ]
      : locale === "zh-Hans"
        ? [
            {
              id: "mode",
              targetSelector: '[data-tour-id="setup-mode-bar"]',
              stepNumber: "1 / 4",
              title: "快速创建 vs 完整设置",
              body: "默认为“⚡ 快速创建（Quick Setup）”，只需填写内容、选风格与角色即可一键生成；如需设置参考图、语速、比例或手绘分镜草稿，可随时切换至“⚙️ 完整设置（Full Details）”。",
            },
            {
              id: "instruction",
              targetSelector: '[data-tour-id="instruction-card"]',
              stepNumber: "2 / 4",
              title: "填写导演指示（Instruction）",
              body: "告诉 AI 导演你想拍什么内容、主题重点、语气以及特定画面要求（或者直接粘贴完整脚本，也可以点下方“示例脚本”一键填入）。",
            },
            {
              id: "style",
              targetSelector: '[data-tour-id="visual-style-card"]',
              stepNumber: "3 / 4",
              title: "选择视觉风格（Visual Style）",
              body: "选择分镜图与视频的画风（例如写实、白板涂鸦、剪纸拼贴等），系统会自动匹配该画风下的可用角色。",
            },
            {
              id: "character",
              targetSelector: '[data-tour-id="character-card"]',
              stepNumber: "4 / 4",
              title: "选择或即时创建角色（Characters）",
              body: "在左侧下拉菜单选择现有角色；如果想创建新角色，直接点击右侧相连的“+ 新建”按钮，即可上传照片或用文字即时创建新角色并自动选中！",
            },
          ]
        : [
            {
              id: "mode",
              targetSelector: '[data-tour-id="setup-mode-bar"]',
              stepNumber: "1 / 4",
              title: "Quick Setup & Full Details",
              body: "Start in “⚡ Quick Setup” to generate fast with just content, style, and character—or switch to “⚙️ Full Details” anytime for reference images, voice, aspect ratio, and storyboard sketches.",
            },
            {
              id: "instruction",
              targetSelector: '[data-tour-id="instruction-card"]',
              stepNumber: "2 / 4",
              title: "Write Your Director Instruction",
              body: "Describe what content you want the AI Director to cover, your key message, tone, and any specific visual requirements (or click a sample script below to try it out).",
            },
            {
              id: "style",
              targetSelector: '[data-tour-id="visual-style-card"]',
              stepNumber: "3 / 4",
              title: "Select Visual Style",
              body: "Pick the visual look for your storyboard and video clips (Realistic, Whiteboard Doodle, Paper Cut-out, etc.).",
            },
            {
              id: "character",
              targetSelector: '[data-tour-id="character-card"]',
              stepNumber: "4 / 4",
              title: "Select or Create a Character",
              body: "Pick an existing character on the left, or click the connected “+ Create” button on the right to create a new character by uploading photos or typing a text description!",
            },
          ];

  const activeStep = steps[stepIndex] ?? steps[0]!;

  useLayoutEffect(() => {
    if (!open) return;

    function measure() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ width: vw, height: vh });

      const el = document.querySelector(activeStep.targetSelector);
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const spotlightR = Math.min(
        Math.max(Math.hypot(b.width / 2, b.height / 2) + 12, 48),
        220,
      );
      setRect({
        left: b.left - 8,
        top: b.top - 8,
        width: b.width + 16,
        height: b.height + 16,
        cx,
        cy,
        spotlightR,
      });
    }

    measure();
    const timer = window.setTimeout(measure, 180);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, activeStep.targetSelector, stepIndex]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setStepIndex(0);
        markCreateVideoTutorialSeen();
        onClose();
      } else if (event.key === "ArrowRight" || event.key === "Enter") {
        if (stepIndex < steps.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          setStepIndex(0);
          markCreateVideoTutorialSeen();
          onClose();
        }
      } else if (event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((i) => i - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stepIndex, steps.length, onClose]);

  if (!open || typeof document === "undefined") return null;

  const finish = () => {
    setStepIndex(0);
    markCreateVideoTutorialSeen();
    onClose();
  };

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const cx = rect ? rect.cx : viewport.width / 2;
  const cy = rect ? rect.cy : viewport.height / 2;
  const outerRadius = 460;
  const placeBelow = cy < viewport.height * 0.52;
  const cardWidth = Math.min(380, viewport.width - 32);
  const cardLeft = Math.max(
    16,
    Math.min(cx - cardWidth / 2, viewport.width - cardWidth - 16),
  );
  const cardTop = rect
    ? placeBelow
      ? Math.min(rect.top + rect.height + 24, viewport.height - 250)
      : Math.max(24, rect.top - 230)
    : viewport.height / 2 - 110;

  const skipLabel =
    locale === "zh-Hant" ? "跳過導覽" : locale === "zh-Hans" ? "跳过导览" : "Skip";
  const prevLabel =
    locale === "zh-Hant" ? "上一步" : locale === "zh-Hans" ? "上一步" : "Back";
  const nextLabel =
    stepIndex < steps.length - 1
      ? locale === "zh-Hant"
        ? "下一步 →"
        : locale === "zh-Hans"
          ? "下一步 →"
          : "Next →"
      : locale === "zh-Hant"
        ? "開始使用 ✓"
        : locale === "zh-Hans"
          ? "开始使用 ✓"
          : "Got it ✓";

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[180] select-none overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={activeStep.title}
      >
        {/* SVG Backdrop with Spotlight Cutout + Feature Discovery Concentric Expanding Circle */}
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
                  rx="20"
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

          {/* Feature Discovery Outer Expanding Halo Circle */}
          <motion.circle
            key={`halo-${activeStep.id}`}
            initial={{ r: 80, opacity: 0 }}
            animate={{ r: outerRadius, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            cx={cx}
            cy={cy}
            fill="rgba(198, 242, 75, 0.16)"
            stroke="rgba(198, 242, 75, 0.55)"
            strokeWidth="2"
            mask={`url(#${maskId})`}
          />

          {/* Pulsing inner ring around the target */}
          {rect ? (
            <motion.rect
              key={`ring-${activeStep.id}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: [0.95, 0.45, 0.95], scale: [1, 1.015, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              x={rect.left - 3}
              y={rect.top - 3}
              width={rect.width + 6}
              height={rect.height + 6}
              rx="22"
              fill="none"
              stroke="#c6f24b"
              strokeWidth="3.5"
            />
          ) : null}
        </svg>

        {/* Feature Discovery Callout Card inside the Spotlight Halo */}
        <motion.div
          key={`card-${activeStep.id}`}
          initial={{ opacity: 0, y: placeBelow ? 14 : -14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            left: `${cardLeft}px`,
            top: `${cardTop}px`,
            width: `${cardWidth}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute rounded-3xl border-2 border-lime bg-[#12141c] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-lime px-2.5 py-0.5 font-display text-xs font-bold text-[#12141c]">
              STEP {activeStep.stepNumber}
            </span>
            <div className="flex items-center gap-1.5">
              {steps.map((s, idx) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === stepIndex
                      ? "w-5 bg-lime"
                      : idx < stepIndex
                        ? "w-2 bg-lime/50"
                        : "w-2 bg-white/25"
                  }`}
                />
              ))}
            </div>
          </div>

          <h3 className="mt-3 font-display text-lg font-bold text-lime">
            {activeStep.title}
          </h3>
          <p className="mt-1.5 text-xs leading-5 text-white/90 sm:text-sm">
            {activeStep.body}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/15 pt-3.5">
            <button
              type="button"
              onClick={finish}
              className="cursor-pointer text-xs font-semibold text-white/65 transition hover:text-white"
            >
              {skipLabel}
            </button>

            <div className="flex items-center gap-2">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={prev}
                  className="inline-flex h-9 cursor-pointer items-center rounded-full border border-white/25 px-3.5 text-xs font-bold text-white transition hover:border-white"
                >
                  {prevLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={next}
                className="inline-flex h-9 cursor-pointer items-center rounded-full bg-lime px-4 font-display text-xs font-bold text-[#12141c] shadow-[2px_2px_0_0_#ffffff] transition hover:-translate-y-0.5"
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
