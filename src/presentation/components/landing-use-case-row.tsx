"use client";

import Link from "next/link";
import { MotionItem } from "@/presentation/components/motion-reveal";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

export type LandingUseCase = {
  id: string;
  art: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta: string;
  href: string;
};

// One use case: cut-out art in a bordered card, copy beside it. `flip` puts the art on the right.
export function LandingUseCaseRow({ item, index, flip }: { item: LandingUseCase; index: number; flip: boolean }) {
  return (
    <MotionItem>
      <article
        id={`use-case-${item.id}`}
        className="grid items-center gap-8 md:gap-12 lg:grid-cols-2"
      >
        <div className={`overflow-hidden rounded-3xl border-2 border-[#12141c] bg-white shadow-[6px_6px_0_0_#12141c] ${flip ? "lg:order-2" : ""}`}>
          <ParallaxLayer distance={20}>
            <img src={item.art} alt="" className="aspect-[4/3] w-full scale-105 object-cover" />
          </ParallaxLayer>
        </div>
        <div className={flip ? "lg:order-1" : ""}>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#12141c]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#12141c] bg-[#c6f24b] text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.eyebrow}
          </p>
          <h3 className="mt-4 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] md:text-4xl">
            {item.title}
          </h3>
          <p className="mt-4 text-base leading-7 text-[#12141c]/75">{item.body}</p>
          <ul className="mt-5 space-y-2">
            {item.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm font-medium text-[#12141c]">
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5fd12a]" />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href={item.href}
            className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {item.cta}
          </Link>
        </div>
      </article>
    </MotionItem>
  );
}
