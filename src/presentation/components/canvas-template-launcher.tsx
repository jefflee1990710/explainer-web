"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import {
  CANVAS_PUBLIC_TEMPLATES,
  canvasLaunchHref,
} from "@/presentation/components/canvas-launch-href";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { CanvasStarterTemplateId } from "@/service/canvas/core/templates";

export function CanvasTemplateLauncher({
  templateId,
  signedIn = false,
}: {
  templateId: CanvasStarterTemplateId;
  signedIn?: boolean;
}) {
  const { locale } = useI18n();
  const lang = locale === "zh-Hant" ? "zh-Hant" : locale === "zh-Hans" ? "zh-Hans" : "en";
  const tpl =
    CANVAS_PUBLIC_TEMPLATES.find((item) => item.id === templateId) ??
    CANVAS_PUBLIC_TEMPLATES[0]!;

  const ctaLabel =
    lang === "zh-Hant"
      ? "在 Scro Canvas 立即啟動"
      : lang === "zh-Hans"
        ? "在 Scro Canvas 立即启动"
        : "Launch in Scro Canvas";
  const secondaryLabel =
    lang === "zh-Hant"
      ? "查看其他範本"
      : lang === "zh-Hans"
        ? "查看其他模板"
        : "Browse All Templates";
  const aiLabel =
    lang === "zh-Hant"
      ? "或直接同 Canvas AI 助理講："
      : lang === "zh-Hans"
        ? "或直接对 Canvas AI 助理说："
        : "Or just tell the Canvas AI Assistant:";

  return (
    <section className="border-b border-[#272a36] bg-[#0d0e13] px-4 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#c6f24b]">
            <Sparkles className="h-3.5 w-3.5" />
            Scro Canvas · {tpl.badge[lang]}
          </span>

          <h1 className="font-display text-pretty text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            {tpl.title[lang]}
          </h1>

          <p className="max-w-xl text-base leading-7 text-white/75">
            {tpl.description[lang]}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {tpl.steps[lang].map((stepLabel, idx) => (
              <div
                key={stepLabel}
                className="rounded-2xl border border-white/12 bg-[#141925] p-3.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c6f24b]">
                  {lang === "en" ? `Step 0${idx + 1}` : `第 ${idx + 1} 步`}
                </span>
                <p className="mt-1.5 font-display text-sm font-bold text-white">
                  {stepLabel}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#c6f24b]/25 bg-[#131823] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#c6f24b]">
              {aiLabel}
            </p>
            <p className="mt-1 text-sm font-medium text-white/90">
              “{tpl.aiPromptExample[lang]}”
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={canvasLaunchHref(signedIn, tpl.id)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#c6f24b] px-8 py-3 text-sm font-extrabold text-[#12141c] shadow-[0_12px_32px_rgba(198,242,75,0.28)] transition hover:brightness-105"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{ctaLabel}</span>
            </Link>
            <Link
              href="/#canvas-templates"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <span>{secondaryLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-[300px] overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
            {tpl.videoUrl ? (
              <video
                src={tpl.videoUrl}
                poster={tpl.posterUrl}
                autoPlay
                muted
                loop
                playsInline
                className="aspect-[9/16] w-full object-cover"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={tpl.posterUrl}
                alt={tpl.title[lang]}
                className="aspect-[9/16] w-full object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
