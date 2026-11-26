"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import {
  CANVAS_PUBLIC_TEMPLATES,
  canvasLaunchHref,
} from "@/presentation/components/canvas-launch-href";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { CanvasStarterTemplateId } from "@/service/canvas/core/templates";

const SHOWCASE_IDS = [
  "talking-head",
  "explainer",
  "scro-swap",
  "teleport",
  "merge-reel",
] as const;

export function LandingCanvasShowcase({ signedIn = false }: { signedIn?: boolean }) {
  const { locale } = useI18n();
  const lang = locale === "zh-Hant" ? "zh-Hant" : locale === "zh-Hans" ? "zh-Hans" : "en";
  const items = SHOWCASE_IDS.map(
    (id) => CANVAS_PUBLIC_TEMPLATES.find((t) => t.id === id)!,
  );
  const [activeId, setActiveId] = useState<CanvasStarterTemplateId>("talking-head");
  const active = items.find((t) => t.id === activeId) ?? items[0]!;

  const heading =
    lang === "zh-Hant"
      ? {
          eyebrow: "CANVAS 工作台 · 零門檻一鍵啟動",
          title: "不用學複雜工具，選好範本或問 AI 助理一句話就開拍。",
          subtitle:
            "把傳統極難上手的 AI 媒體工具變成一目了然的積木流程。你想拍對嘴口播、動畫解說、換角還是實景換場，點一下就自動排好。",
          aiLabel: "Canvas AI 助理對話示範",
          outputLabel: "即時成品預覽",
          cta: "在 Canvas 打開此範本",
        }
      : lang === "zh-Hans"
        ? {
            eyebrow: "CANVAS 工作台 · 零门槛一键启动",
            title: "不用学复杂工具，选好模板或对 AI 助理说一句就开拍。",
            subtitle:
              "把难上手的 AI 媒体工具变成一目了然的积木流程。无论是对嘴口播、动画解说、换角还是实景换场，点一下就自动排好。",
            aiLabel: "Canvas AI 助理对话示范",
            outputLabel: "实时成品预览",
            cta: "在 Canvas 打开此模板",
          }
        : {
            eyebrow: "SCRO CANVAS · EFFORTLESS AI CREATION",
            title: "No complex setup. Pick a workflow or ask the AI Assistant, then hit Run.",
            subtitle:
              "Every creator workflow—talking-head reels, animated explainers, character swaps, scene teleports, and automatic voice & clip assembly—works as simple, ready-to-run building blocks.",
            aiLabel: "Ask the Canvas AI Assistant",
            outputLabel: "Live Result Preview",
            cta: "Open This Workflow in Canvas",
          };

  return (
    <section
      id="canvas-showcase"
      className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f4fcd4] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#12141c]">
            <Sparkles className="h-3.5 w-3.5" />
            {heading.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {heading.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{heading.subtitle}</p>
        </div>

        {/* Interactive workflow switcher tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {items.map((item) => {
            const isActive = item.id === active.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm ${
                  isActive
                    ? "bg-[#12141c] text-[#c6f24b] shadow-md"
                    : "border border-[#e4e4e7] bg-[#fafafa] text-[#5c6170] hover:border-[#12141c]/30 hover:text-[#12141c]"
                }`}
              >
                {item.title[lang]}
              </button>
            );
          })}
        </div>

        {/* Visual Canvas Stage */}
        <div className="mt-8 grid items-center gap-6 overflow-hidden rounded-3xl border border-[#252c3b] bg-[#0e121a] p-5 text-white shadow-[0_24px_60px_rgba(18,20,28,0.16)] md:p-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Simplified visual node cards + AI Assistant bubble */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#c6f24b]">
                {active.badge[lang]}
              </span>
              <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
                {active.title[lang]}
              </h3>
            </div>

            <p className="text-sm leading-6 text-white/70">{active.description[lang]}</p>

            {/* 3-step visual connected canvas nodes */}
            <div className="grid gap-3 sm:grid-cols-3">
              {active.steps[lang].map((stepLabel, idx) => (
                <div key={stepLabel} className="relative flex items-center gap-2">
                  <div className="w-full rounded-2xl border border-white/12 bg-[#141925] p-3.5 shadow-inner">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/45">
                      <span>{lang === "en" ? `Step 0${idx + 1}` : `第 ${idx + 1} 步`}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          idx === 2 ? "bg-[#c6f24b]" : "bg-sky-400"
                        }`}
                      />
                    </div>
                    <p className="mt-2 font-display text-sm font-bold text-white">{stepLabel}</p>
                  </div>
                  {idx < active.steps[lang].length - 1 ? (
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-[#c6f24b] sm:block" />
                  ) : null}
                </div>
              ))}
            </div>

            {/* AI Assistant prompt box */}
            <div className="rounded-2xl border border-[#c6f24b]/25 bg-[#131823] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#c6f24b]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{heading.aiLabel}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-white/90">
                “{active.aiPromptExample[lang]}”
              </p>
            </div>

            <div className="pt-1">
              <Link
                href={canvasLaunchHref(signedIn, active.id)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#c6f24b] px-7 py-3 text-sm font-extrabold text-[#12141c] shadow-[0_10px_28px_rgba(198,242,75,0.28)] transition hover:brightness-105"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{heading.cta}</span>
              </Link>
            </div>
          </div>

          {/* Right: Live video output preview */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#141925] px-3 py-2 text-[11px] font-semibold text-white/75">
                <span>{heading.outputLabel}</span>
                <span className="inline-flex items-center gap-1 text-[#c6f24b]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
                  {lang === "en" ? "Ready" : "完成"}
                </span>
              </div>
              {active.videoUrl ? (
                <video
                  key={active.id}
                  src={active.videoUrl}
                  poster={active.posterUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="aspect-[9/16] w-full object-cover"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={active.posterUrl}
                  alt={active.title[lang]}
                  className="aspect-[9/16] w-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
