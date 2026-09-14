"use client";

import { MotionItem, MotionStagger } from "@/components/motion-reveal";

const STEPS = [
  {
    step: "01",
    title: "選風格",
    body: "依用途挑選解說風格：短影音、行銷、簡報與更多類型會持續擴充。",
    tint: "bg-lime",
  },
  {
    step: "02",
    title: "核准分鏡",
    body: "AI 先交提案：標題、鉤子、分鏡與旁白。你改到滿意再繼續。",
    tint: "bg-sky",
  },
  {
    step: "03",
    title: "產出影片",
    body: "核准後自動產角色定裝與各段 clips，可直接用於 Reels、廣告與簡報。",
    tint: "bg-accent text-white",
  },
] as const;

export function LandingSteps() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <MotionStagger className="grid gap-5 md:grid-cols-3">
        {STEPS.map((item) => (
          <MotionItem key={item.step}>
            <article className="h-full rounded-[1.5rem] border border-accent-ink/10 bg-paper/80 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)] backdrop-blur">
              <span
                className={`inline-flex rounded-full px-3 py-1 font-display text-xs font-bold tracking-wide ${item.tint}`}
              >
                {item.step}
              </span>
              <h2 className="font-display mt-4 text-2xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.body}</p>
            </article>
          </MotionItem>
        ))}
      </MotionStagger>
    </section>
  );
}
