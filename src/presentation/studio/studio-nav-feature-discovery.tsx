"use client";

import { useEffect, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";

const STUDIO_NAV_TUTORIAL_SEEN_KEY = "scro:studio-nav-create-feature-discovery:seen:v1";

export type StudioNavDiscoveryStep = {
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
};

// Returns true once the user has completed or dismissed the first-login left-rail tour.
export function hasSeenStudioNavTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STUDIO_NAV_TUTORIAL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStudioNavTutorialSeen(seen: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (seen) {
      window.localStorage.setItem(STUDIO_NAV_TUTORIAL_SEEN_KEY, "1");
    } else {
      window.localStorage.removeItem(STUDIO_NAV_TUTORIAL_SEEN_KEY);
    }
  } catch {
    // Ignore storage quota errors.
  }
}

// First-login Feature Discovery spotlight overlay introducing the 4 Create buttons in the left studio rail.
export function StudioNavFeatureDiscovery({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const maskId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });

  const steps: StudioNavDiscoveryStep[] =
    locale === "zh-Hant"
      ? [
          {
            id: "explainers",
            targetSelector: '[data-rail-tour="/app/explainers"]',
            stepNumber: "1 / 5",
            title: "1. 解說短片 · Explainer Video",
            body: "輸入主題或腳本，由 AI 導演自動規劃多鏡分鏡圖、配音旁白、雙色字幕與音效，一鍵生成高留存率解說短片（白板塗鴉、剪紙拼貼、3D 動畫等）。",
          },
          {
            id: "talking-heads",
            targetSelector: '[data-rail-tour="/app/talking-heads"]',
            stepNumber: "2 / 5",
            title: "2. 對鏡口播 · Talking Head Video",
            body: "揀選對鏡姿勢／取景、視覺風格與角色，只需輸入講稿或上傳音訊，即可生成自然嘴型與微表情同步嘅真人感口播 Reels！",
          },
          {
            id: "life",
            targetSelector: '[data-rail-tour="/app/life"]',
            stepNumber: "3 / 5",
            title: "3. 日常生活照 · Life",
            body: "為你嘅角色一鍵生成街頭 OOTD、咖啡店、旅行等 IG 生活貼文相片，亦支援進階人物替換、放入實景與姿勢自訂。",
          },
          {
            id: "scroswap",
            targetSelector: '[data-rail-tour="/app/scroswap"]',
            stepNumber: "4 / 5",
            title: "4. 影片換角 · Scro Swap",
            body: "上傳任何實拍或參考影片，將畫面中嘅主角替換成你指定嘅角色與造型，完整保留原片動作、節奏與運鏡。",
          },
          {
            id: "teleport",
            targetSelector: '[data-rail-tour="/app/teleport"]',
            stepNumber: "5 / 5",
            title: "5. 影片換場 · Teleport",
            body: "上傳短片，把原來的人放進新背景與場景。臉、穿搭與動作留住，位置、大小與光線可以配合新地方。",
          },
        ]
      : locale === "zh-Hans"
        ? [
            {
              id: "explainers",
              targetSelector: '[data-rail-tour="/app/explainers"]',
              stepNumber: "1 / 5",
              title: "1. 解说短片 · Explainer Video",
              body: "输入主题或脚本，由 AI 导演自动规划多镜分镜图、配音旁白、双色字幕与音效，一键生成高留存率解说短片（白板涂鸦、剪纸拼贴、3D 动画等）。",
            },
            {
              id: "talking-heads",
              targetSelector: '[data-rail-tour="/app/talking-heads"]',
              stepNumber: "2 / 5",
              title: "2. 对镜口播 · Talking Head Video",
              body: "选择对镜姿势／取景、视觉风格与角色，只需输入讲稿或上传音频，即可生成自然嘴型与微表情同步的真人感口播 Reels！",
            },
            {
              id: "life",
              targetSelector: '[data-rail-tour="/app/life"]',
              stepNumber: "3 / 5",
              title: "3. 日常生活照 · Life",
              body: "为你的角色一键生成街头 OOTD、咖啡店、旅行等 IG 生活贴文照片，也支持进阶人物替换、放入实景与姿势自定义。",
            },
            {
              id: "scroswap",
              targetSelector: '[data-rail-tour="/app/scroswap"]',
              stepNumber: "4 / 5",
              title: "4. 视频换角 · Scro Swap",
              body: "上传任何实拍或参考视频，将画面中的主角替换成你指定的角色与造型，完整保留原片动作、节奏与运镜。",
            },
            {
              id: "teleport",
              targetSelector: '[data-rail-tour="/app/teleport"]',
              stepNumber: "5 / 5",
              title: "5. 视频换场 · Teleport",
              body: "上传短片，把原来的人放进新背景与场景。脸、穿搭与动作留住，位置、大小与光线可以配合新地方。",
            },
          ]
        : [
            {
              id: "explainers",
              targetSelector: '[data-rail-tour="/app/explainers"]',
              stepNumber: "1 / 5",
              title: "1. Explainer Video",
              body: "Turn any topic or script into a multi-scene animated explainer video—complete with AI storyboards, voiceover, stylized captions, and sound effects.",
            },
            {
              id: "talking-heads",
              targetSelector: '[data-rail-tour="/app/talking-heads"]',
              stepNumber: "2 / 5",
              title: "2. Talking-Head Video",
              body: "Pick framing pose, style, and character, then type your script or upload audio to generate natural lip-sync talking-head Reels.",
            },
            {
              id: "life",
              targetSelector: '[data-rail-tour="/app/life"]',
              stepNumber: "3 / 5",
              title: "3. Life Photos",
              body: "Generate everyday lifestyle & OOTD photos for your character in one click, or use Advanced settings to replace a person or place your character into any scene.",
            },
            {
              id: "scroswap",
              targetSelector: '[data-rail-tour="/app/scroswap"]',
              stepNumber: "4 / 5",
              title: "4. Scro Swap",
              body: "Upload a reference video and swap the performer with your chosen character and outfit while preserving the original motion and camera work.",
            },
            {
              id: "teleport",
              targetSelector: '[data-rail-tour="/app/teleport"]',
              stepNumber: "5 / 5",
              title: "5. Teleport",
              body: "Upload a clip and place the same person in a new background and scene. Face, outfit, and motion stay; position, scale, and light can fit the new place.",
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
      const pad = 6;
      setRect({
        left: Math.max(2, b.left - pad),
        top: Math.max(2, b.top - pad),
        width: b.width + pad * 2,
        height: b.height + pad * 2,
        cx: b.left + b.width / 2,
        cy: b.top + b.height / 2,
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
        setStudioNavTutorialSeen(dontShowAgain);
        onClose();
      } else if (event.key === "ArrowRight" || event.key === "Enter") {
        if (stepIndex < steps.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          setStepIndex(0);
          setStudioNavTutorialSeen(dontShowAgain);
          onClose();
        }
      } else if (event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((i) => i - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stepIndex, steps.length, dontShowAgain, onClose]);

  if (!open || typeof document === "undefined") return null;

  const finish = () => {
    setStepIndex(0);
    setStudioNavTutorialSeen(dontShowAgain);
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

  const cx = rect ? rect.cx : 36;
  const cy = rect ? rect.cy : viewport.height / 3;
  const outerRadius = 380;

  const cardWidth = Math.min(380, viewport.width - 32);
  const cardHeight = 235;
  const cardLeft = rect
    ? Math.min(rect.left + rect.width + 24, Math.max(16, viewport.width - cardWidth - 16))
    : 92;
  const cardTop = rect
    ? Math.max(16, Math.min(cy - cardHeight / 2, viewport.height - cardHeight - 16))
    : 96;

  const groupBadgeLabel =
    locale === "zh-Hant"
      ? "左側創作選單 · Create Menu"
      : locale === "zh-Hans"
        ? "左侧创作菜单 · Create Menu"
        : "Left Create Menu";
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
        ? "開始創作 ✓"
        : locale === "zh-Hans"
          ? "开始创作 ✓"
          : "Got it ✓";
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
        {/* SVG Backdrop with Spotlight Cutout + Concentric Expanding Halo */}
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

          {/* Outer Expanding Halo Circle */}
          <motion.circle
            key={`halo-${activeStep.id}`}
            initial={{ r: 60, opacity: 0 }}
            animate={{ r: outerRadius, opacity: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            cx={cx}
            cy={cy}
            fill="rgba(198, 242, 75, 0.16)"
            stroke="rgba(198, 242, 75, 0.55)"
            strokeWidth="2"
            mask={`url(#${maskId})`}
          />

          {/* Pulsing inner ring around the target icon */}
          {rect ? (
            <motion.rect
              key={`ring-${activeStep.id}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: [0.95, 0.45, 0.95], scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              x={rect.left - 2}
              y={rect.top - 2}
              width={rect.width + 4}
              height={rect.height + 4}
              rx="16"
              fill="none"
              stroke="#c6f24b"
              strokeWidth="3.5"
            />
          ) : null}
        </svg>

        {/* Callout Card placed to the right of the left rail */}
        <motion.div
          key={`card-${activeStep.id}`}
          initial={{ opacity: 0, x: -10, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
              {groupBadgeLabel} · {activeStep.stepNumber}
            </span>
            <div className="flex items-center gap-1.5">
              {steps.map((s, idx) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === stepIndex
                      ? "w-5 bg-[#c6f24b]"
                      : idx < stepIndex
                        ? "w-2 bg-[#c6f24b]/50"
                        : "w-2 bg-white/25"
                  }`}
                />
              ))}
            </div>
          </div>

          <h3 className="mt-3 font-display text-lg font-bold text-[#c6f24b]">
            {activeStep.title}
          </h3>
          <p className="mt-1.5 text-xs leading-5 text-white/90 sm:text-sm">
            {activeStep.body}
          </p>

          {/* Don't show again checkbox (default checked so first-login tour shows once) */}
          <label className="mt-3.5 inline-flex cursor-pointer items-center gap-2 text-xs text-white/80 transition hover:text-white">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                setDontShowAgain(checked);
                setStudioNavTutorialSeen(checked);
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
                className="inline-flex h-9 cursor-pointer items-center rounded-full bg-[#c6f24b] px-4 font-display text-xs font-bold text-[#12141c] shadow-[2px_2px_0_0_#ffffff] transition hover:-translate-y-0.5"
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
