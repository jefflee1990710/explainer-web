"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import {
  CANVAS_PUBLIC_TEMPLATES,
  canvasLaunchHref,
} from "@/presentation/components/canvas-launch-href";
import { useI18n } from "@/presentation/components/i18n-provider";
import { SHOWCASE_COPY } from "@/presentation/components/landing-canvas-showcase-copy";
import { ShowcaseStage } from "@/presentation/components/landing-canvas-showcase-stage";
import { ShowcaseSteps } from "@/presentation/components/landing-canvas-showcase-steps";
import { heroLang } from "@/presentation/components/landing-hero-canvas-copy";
import type { CanvasStarterTemplateId } from "@/service/canvas/core/templates";

const SHOWCASE_IDS = [
  "talking-head",
  "explainer",
  "scro-swap",
  "teleport",
  "merge-reel",
] as const;

const STEP_MS = 3600;

// "Idea → finished reel" walkthrough: four steps that auto-play on a mini canvas, plus a workflow picker and CTA.
export function LandingCanvasShowcase({ signedIn = false }: { signedIn?: boolean }) {
  const { locale } = useI18n();
  const lang = heroLang(locale);
  const copy = SHOWCASE_COPY[lang];
  const reduceMotion = useReducedMotion();
  const items = SHOWCASE_IDS.map((id) => CANVAS_PUBLIC_TEMPLATES.find((t) => t.id === id)!);
  const [activeId, setActiveId] = useState<CanvasStarterTemplateId>("talking-head");
  const [step, setStep] = useState(0);
  const [userPicked, setUserPicked] = useState(false);
  const active = items.find((t) => t.id === activeId) ?? items[0]!;
  const autoPlay = !userPicked && !reduceMotion;

  // Advance one step at a time until the visitor picks a step themselves.
  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setTimeout(() => setStep((s) => (s + 1) % copy.steps.length), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [autoPlay, step, copy.steps.length]);

  return (
    <section
      id="canvas-showcase"
      className="scroll-mt-20 border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f4fcd4] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#12141c]">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{copy.subtitle}</p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
          <ShowcaseSteps
            steps={copy.steps}
            active={step}
            autoPlay={autoPlay}
            durationMs={STEP_MS}
            onSelect={(i) => {
              setUserPicked(true);
              setStep(i);
            }}
          />

          <div className="space-y-5">
            {/* Workflow picker: changes the blocks, the assistant prompt, and the finished reel */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[#8a8f9c]">{copy.tryWith}</span>
              {items.map((item) => {
                const isActive = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
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

            <ShowcaseStage step={step} template={active} lang={lang} copy={copy} />

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href={canvasLaunchHref(signedIn, active.id)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#c6f24b] px-7 py-3 text-sm font-extrabold text-[#12141c] shadow-[0_10px_28px_rgba(198,242,75,0.28)] transition hover:brightness-105"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{copy.cta}</span>
              </Link>
              <p className="text-xs font-medium text-[#5c6170]">{copy.ctaNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
