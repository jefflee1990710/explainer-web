"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Conversion CTA banner / sidebar card encouraging readers to register for Scro and claim free credits.
export function BlogPostRegisterCta({
  variant = "inline",
  signedIn = false,
}: {
  variant?: "inline" | "sidebar" | "bottom";
  signedIn?: boolean;
}) {
  const { locale } = useI18n();
  const isZh = locale.startsWith("zh");

  const copy = isZh
    ? {
        eyebrow: "免費體驗 Scro AI Studio",
        title:
          variant === "sidebar"
            ? "把你的專業變成日更 AI 短片"
            : "不用親自上鏡，用你的知識打造專屬 AI 網紅與高留存 Explainer 短片",
        body:
          variant === "sidebar"
            ? "立即免費註冊領取體驗 Credits。支援麥克風錄音複製聲線、21 國語言配音、白板解說與一鍵字幕剪輯。"
            : "註冊即送免費體驗 Credits。內建麥克風即時錄音複製聲線（支援廣東話、國語、英文等 21 種語言）、手繪分鏡草稿與 AI 導演，幾分鐘產出 Reels、Shorts 與 TikTok 成片。",
        ctaPrimary: signedIn ? "進入創作工作台 →" : "免費註冊 Scro 領取 Credits →",
        ctaSecondary: "查看範例成果",
        bullets: ["免信用卡立即試用", "21 種語言聲線複製", "內建 AI 導演與字幕剪輯"],
      }
    : {
        eyebrow: "Try Scro AI Studio for Free",
        title:
          variant === "sidebar"
            ? "Turn your expertise into daily AI reels"
            : "Turn your knowledge into high-retention AI Influencer & Explainer videos",
        body:
          variant === "sidebar"
            ? "Create a free account to claim starter credits. Clone your voice in-browser across 21 languages, plan storyboards with AI, and ship ready-to-post Reels."
            : "Register now and claim free starter credits. Record your voice with the built-in mic across 21 languages, lock your AI Influencer's face & wardrobe, and ship scroll-stopping Reels, Shorts, and TikToks in minutes.",
        ctaPrimary: signedIn ? "Open Studio Workspace →" : "Register Free & Claim Credits →",
        ctaSecondary: "See Examples",
        bullets: ["Free starter credits", "21-language voice cloning", "Built-in AI directors & editor"],
      };

  const targetHref = signedIn ? "/app" : "/sign-up";

  if (variant === "sidebar") {
    return (
      <div className="rounded-2xl border border-[#12141c] bg-[#12141c] p-5 text-white shadow-[0_12px_32px_rgba(18,20,28,0.12)]">
        <span className="inline-flex items-center rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#c6f24b]">
          {copy.eyebrow}
        </span>
        <h3 className="mt-3 font-display text-lg font-bold leading-snug text-white">
          {copy.title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/75">{copy.body}</p>
        <ul className="mt-3 space-y-1.5 text-xs text-white/85">
          {copy.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link
          href={targetHref}
          className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-full bg-[#c6f24b] px-4 py-2 text-center text-xs font-bold text-[#12141c] transition hover:-translate-y-0.5 hover:bg-[#d4f76e]"
        >
          {copy.ctaPrimary}
        </Link>
      </div>
    );
  }

  return (
    <aside
      aria-label={copy.eyebrow}
      className="my-8 overflow-hidden rounded-2xl border border-[#12141c]/15 bg-gradient-to-br from-[#12141c] via-[#181b26] to-[#12141c] p-6 text-white shadow-[0_12px_32px_rgba(18,20,28,0.1)] sm:p-8"
    >
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <span className="inline-flex items-center rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#c6f24b]">
            {copy.eyebrow}
          </span>
          <h3 className="mt-3 font-display text-xl font-bold leading-snug text-white sm:text-2xl">
            {copy.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/75">{copy.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/85">
            {copy.bullets.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col">
          <Link
            href={targetHref}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#c6f24b] px-6 py-2.5 text-center text-sm font-bold text-[#12141c] shadow-[3px_3px_0_0_rgba(255,77,46,0.9)] transition hover:-translate-y-0.5 hover:bg-[#d4f76e]"
          >
            {copy.ctaPrimary}
          </Link>
          <Link
            href="/examples"
            className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/10"
          >
            {copy.ctaSecondary}
          </Link>
        </div>
      </div>
    </aside>
  );
}
