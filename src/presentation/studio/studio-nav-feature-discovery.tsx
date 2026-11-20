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
            id: "canvas",
            targetSelector: '[data-rail-tour="/app/canvas"]',
            stepNumber: "1 / 3",
            title: "1. Canvas 創作畫布",
            body: "將 Talking Head、Explainer、Scro Swap、Teleport、TTS 配音同 FFmpeg 剪輯全部整合於畫布，自由串接成一站式工作流並背景自動執行。",
          },
          {
            id: "characters",
            targetSelector: '[data-rail-tour="/app/characters"]',
            stepNumber: "2 / 3",
            title: "2. 專屬 AI 角色庫",
            body: "建立鎖臉鎖聲的專屬 AI 網紅角色與服裝造型，隨時在 Canvas 各工具節點直接取用。",
          },
          {
            id: "videos",
            targetSelector: '[data-rail-tour="/app/videos"]',
            stepNumber: "3 / 3",
            title: "3. 影片庫與下載",
            body: "集中檢視所有口播、解說、換角與換場影片紀錄，支援即時彈窗預覽與下載 MP4。",
          },
        ]
      : locale === "zh-Hans"
        ? [
            {
              id: "canvas",
              targetSelector: '[data-rail-tour="/app/canvas"]',
              stepNumber: "1 / 3",
              title: "1. Canvas 创作画布",
              body: "将 Talking Head、Explainer、Scro Swap、Teleport、TTS 配音与 FFmpeg 剪辑整合于画布，自由串联成一站式工作流并后台自动执行。",
            },
            {
              id: "characters",
              targetSelector: '[data-rail-tour="/app/characters"]',
              stepNumber: "2 / 3",
              title: "2. 专属 AI 角色库",
              body: "创建锁脸锁声的专属 AI 网红角色与服装造型，随时在 Canvas 各工具节点直接取用。",
            },
            {
              id: "videos",
              targetSelector: '[data-rail-tour="/app/videos"]',
              stepNumber: "3 / 3",
              title: "3. 视频库与下载",
              body: "集中查看所有口播、解说、换角与换场视频记录，支持即时弹窗预览与下载 MP4。",
            },
          ]
        : [
            {
              id: "canvas",
              targetSelector: '[data-rail-tour="/app/canvas"]',
              stepNumber: "1 / 3",
              title: "1. Canvas Studio",
              body: "Talking Head, Explainer, Scro Swap, Teleport, ElevenLabs TTS, and FFmpeg editing all live inside Canvas as composable workflow nodes.",
            },
            {
              id: "characters",
              targetSelector: '[data-rail-tour="/app/characters"]',
              stepNumber: "2 / 3",
              title: "2. AI Characters",
              body: "Build face- and voice-locked AI characters with custom outfits ready for every Canvas tool node.",
            },
            {
              id: "videos",
              targetSelector: '[data-rail-tour="/app/videos"]',
              stepNumber: "3 / 3",
              title: "3. Video Gallery",
              body: "Review generation status, preview finished reels, and download MP4 files anytime.",
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
