"use client";

import { LandingShowcaseCard } from "@/presentation/components/landing-showcase-card";
import { EXAMPLE_FRAME, type ExampleItem } from "@/presentation/components/example-catalog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { localizedStyleName } from "@/util/style-i18n";

// One explainer type: copy on one side, the clip on the other.
export function ExampleBand({ item, flip }: { item: ExampleItem; flip: boolean }) {
  const { t } = useI18n();
  const frame = EXAMPLE_FRAME[item.aspect];

  return (
    <section id={item.id} className="border-t border-zinc-100 bg-white">
      <div className="grid w-full items-center lg:grid-cols-2">
        <div
          className={`px-6 py-12 sm:px-10 sm:py-16 lg:py-20 ${
            flip ? "text-right lg:order-2 lg:pl-10 lg:pr-16" : "text-left lg:order-1 lg:pl-16 lg:pr-10"
          }`}
        >
          <div className={`mx-auto max-w-lg ${flip ? "lg:ml-auto lg:mr-0" : "lg:ml-0 lg:mr-auto"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {t(item.useKey)} · {item.aspect}
            </p>
            <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl">
              {t(item.titleKey)}
            </h2>
            <p className="mt-4 text-base text-zinc-600">{t(item.bodyKey)}</p>
            <p className="mt-4 text-sm font-medium text-zinc-800">{localizedStyleName(item.styleId)}</p>
          </div>
        </div>
        <div className={`flex justify-center px-4 py-8 sm:px-8 ${flip ? "lg:order-1" : "lg:order-2"}`}>
          <LandingShowcaseCard
            src={item.src}
            poster={item.poster}
            widthClass={frame.width}
            aspectClass={frame.aspect}
          />
        </div>
      </div>
    </section>
  );
}
