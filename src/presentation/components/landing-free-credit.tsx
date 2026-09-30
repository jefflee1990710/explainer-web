"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Register-for-credits band. Still and loop are Gemini assets in /public/cta.
export function LandingFreeCredit({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section className="bg-[#f7fbe8] px-4 py-16 md:px-8 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <video
            src="/cta/loop.mp4"
            poster="/cta/still.png"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
            className="aspect-video w-full object-cover motion-reduce:hidden"
          />
          <img
            src="/cta/still.png"
            alt=""
            className="hidden aspect-video w-full object-cover motion-reduce:block"
          />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#12141c]">
            {t("landing.freeCredit.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#12141c] md:text-4xl">
            {t("landing.freeCredit.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">{t("landing.freeCredit.body")}</p>
          <Link
            href={signedIn ? "/app" : "/sign-up"}
            className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {t("landing.freeCredit.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
