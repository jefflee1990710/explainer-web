"use client";

import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

export type FeatureExample = { src: string; title: string; body: string };

// Shared gallery: four pictured examples under one heading, matching the studio cards.
export function FeatureExamples({
  eyebrow,
  title,
  body,
  items,
}: {
  eyebrow: string;
  title: string;
  body: string;
  items: FeatureExample[];
}) {
  return (
    <section className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{body}</p>
        </div>
        <MotionStagger className="mt-14 grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <MotionItem key={item.src}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
                <img src={item.src} alt="" className="aspect-video w-full border-b border-[#e4e4e7] bg-[#12141c] object-cover" />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
                </div>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
