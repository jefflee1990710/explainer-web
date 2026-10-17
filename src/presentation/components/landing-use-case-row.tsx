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

// One use case inside a Studio desk card: clean 1px border, 16px corners, soft hover lift.
export function LandingUseCaseRow({ item, index, flip }: { item: LandingUseCase; index: number; flip: boolean }) {
  return (
    <MotionItem>
      <article
        id={`use-case-${item.id}`}
        className="grid items-center gap-8 rounded-2xl border border-[#e4e4e7] bg-white p-6 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)] md:gap-12 md:p-10 lg:grid-cols-2"
      >
        <div className={`overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#fafafa] ${flip ? "lg:order-2" : ""}`}>
          <ParallaxLayer distance={20}>
            <img src={item.art} alt="" className="aspect-[4/3] w-full scale-105 object-cover" />
          </ParallaxLayer>
        </div>
        <div className={flip ? "lg:order-1" : ""}>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#12141c] text-xs font-bold text-[#c6f24b]">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.eyebrow}
          </p>
          <h3 className="mt-4 font-display text-pretty text-2xl font-bold leading-[1.15] tracking-tight text-[#12141c] md:text-3xl">
            {item.title}
          </h3>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{item.body}</p>
          <ul className="mt-5 space-y-2.5">
            {item.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm font-medium text-[#12141c]">
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c6f24b] ring-2 ring-[#12141c]/15" />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href={item.href}
            className="mt-8 inline-flex min-h-10 items-center justify-center rounded-full bg-[#12141c] px-7 py-2.5 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {item.cta}
          </Link>
        </div>
      </article>
    </MotionItem>
  );
}
