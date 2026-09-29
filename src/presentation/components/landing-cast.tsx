"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Full-width band: copy on the left, rich plan-style art on the right.
export function LandingCast() {
  const { t } = useI18n();
  const uses = [
    t("landing.cast.product"),
    t("landing.cast.service"),
    t("landing.cast.knowledge"),
  ];

  return (
    <section id="characters" className="bg-white">
      <div className="grid w-full items-center lg:grid-cols-2">
        <div className="px-6 py-12 text-left sm:px-10 sm:py-16 lg:py-24 lg:pl-16 lg:pr-10">
            <div className="mx-auto max-w-lg lg:ml-0 lg:mr-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {t("landing.cast.eyebrow")}
            </p>
            <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
              {t("landing.cast.title")}
            </h2>
            <p className="mt-4 text-base text-zinc-600">{t("landing.cast.body")}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {uses.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-[#12141c]/15 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
                >
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href="/app/characters"
              className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
            >
              {t("landing.cast.cta")}
            </Link>
          </div>
        </div>
        <img
          src="/landing/character-cast.png?v=4"
          alt=""
          className="h-72 w-full object-contain sm:h-96 lg:h-full lg:min-h-[32rem] lg:p-8"
        />
      </div>
    </section>
  );
}
