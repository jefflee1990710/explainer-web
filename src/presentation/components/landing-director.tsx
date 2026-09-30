"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Full-width band: the cost of retries on the left, plan-style art on the right.
export function LandingDirector() {
  const { t } = useI18n();
  const points = [
    t("landing.director.idea"),
    t("landing.director.takes"),
    t("landing.director.cost"),
  ];

  return (
    <section id="cost" className="bg-white">
      <div className="grid w-full items-center lg:grid-cols-2">
        <div className="px-6 py-12 text-left sm:px-10 sm:py-16 lg:py-24 lg:pl-16 lg:pr-10">
          <div className="mx-auto max-w-lg lg:ml-0 lg:mr-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {t("landing.director.eyebrow")}
            </p>
            <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
              {t("landing.director.title")}
            </h2>
            <p className="mt-4 text-base text-zinc-600">{t("landing.director.body")}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {points.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-[#12141c]/15 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
                >
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href="/app"
              className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
            >
              {t("landing.director.cta")}
            </Link>
          </div>
        </div>
        <video
          src="/landing/director-cost-loop.mp4"
          poster="/landing/director-cost.png?v=2"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="h-72 w-full object-contain sm:h-96 lg:h-full lg:min-h-[32rem] lg:p-8 motion-reduce:hidden"
        />
        <img
          src="/landing/director-cost.png?v=2"
          alt=""
          className="hidden h-72 w-full object-contain motion-reduce:block sm:h-96 lg:h-full lg:min-h-[32rem] lg:p-8"
        />
      </div>
    </section>
  );
}
