"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Closing band — pick the right tool and ship.
export function RightToolCta({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section className="border-t border-[#e4e4e7] bg-[#f4fcd4] px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center rounded-full bg-[#12141c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
          {t("rightTool.cta.eyebrow")}
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#12141c] md:text-4xl">
          {t("rightTool.cta.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#5c6170]">{t("rightTool.cta.body")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={signedIn ? "/app/characters" : "/sign-up"}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {t("rightTool.cta.cta")}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#12141c]/15 bg-white px-8 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100"
          >
            {t("rightTool.cta.ctaPricing")}
          </Link>
        </div>
      </div>
    </section>
  );
}
