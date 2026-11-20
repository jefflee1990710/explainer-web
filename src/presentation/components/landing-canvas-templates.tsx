"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CANVAS_PUBLIC_TEMPLATES,
  canvasLaunchHref,
} from "@/presentation/components/canvas-launch-href";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

export function LandingCanvasTemplates({ signedIn = false }: { signedIn?: boolean }) {
  const { locale } = useI18n();
  const lang = locale === "zh-Hant" ? "zh-Hant" : locale === "zh-Hans" ? "zh-Hans" : "en";

  const header =
    lang === "zh-Hant"
      ? {
          eyebrow: "一鍵套用 · 6 款即用範本",
          title: "從空白開始太慢？揀一張範本，換上你嘅文字或影片即刻跑。",
          subtitle: "所有流程已經預先駁好，一打開 Canvas 就可以直接按 Run Flow 出片。",
          cta: "打開 Canvas 範本",
        }
      : lang === "zh-Hans"
        ? {
            eyebrow: "一键套用 · 6 款即用模板",
            title: "从空白开始太慢？挑一张模板，换上你的文字或视频马上跑。",
            subtitle: "所有流程都已预先搭好，一打开 Canvas 就能直接按 Run Flow 出片。",
            cta: "打开 Canvas 模板",
          }
        : {
            eyebrow: "ONE-CLICK TEMPLATES",
            title: "Start from 6 ready-made Canvas workflows—no blank-page guesswork.",
            subtitle:
              "Every workflow comes pre-wired. Drop in your script, character, or video clip and click Run Flow.",
            cta: "Open in Canvas",
          };

  return (
    <section
      id="canvas-templates"
      className="scroll-mt-16 border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#12141c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {header.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {header.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{header.subtitle}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CANVAS_PUBLIC_TEMPLATES.map((tpl) => (
            <MotionItem key={tpl.id}>
              <article className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white p-6 transition-shadow duration-200 hover:shadow-[0_12px_32px_rgba(18,20,28,0.08)]">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#f4fcd4] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#12141c]">
                      {tpl.badge[lang]}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-xl font-bold text-[#12141c]">
                    {tpl.title[lang]}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5c6170]">
                    {tpl.description[lang]}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {tpl.steps[lang].map((step, i) => (
                      <span key={step} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#12141c]">
                        <span className="rounded-md border border-[#e4e4e7] bg-[#fafafa] px-2 py-0.5">
                          {step}
                        </span>
                        {i < tpl.steps[lang].length - 1 ? (
                          <span className="text-[#5c6170]">→</span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-[#e4e4e7] pt-4">
                  <Link
                    href={canvasLaunchHref(signedIn, tpl.id)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#12141c] transition hover:text-black"
                  >
                    <span>{header.cta}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
