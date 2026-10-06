"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

const PREVIEWS = "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles";

// Each step shows a different system style preview so the band reads as "many looks".
const STEP_LOOKS = [
  { art: `${PREVIEWS}/paper-cutout-preview.webp`, badge: "bg-[#ff6b4a] text-white" },
  { art: `${PREVIEWS}/chalkboard-color-preview.webp`, badge: "bg-[#3b82f6] text-white" },
  { art: `${PREVIEWS}/pixel-preview.webp`, badge: "bg-[#c6f24b] text-[#12141c]" },
] as const;

export function LandingSteps() {
  const { t } = useI18n();
  const steps = [
    { step: "01", title: t("landing.steps.step1Title"), body: t("landing.steps.step1Body") },
    { step: "02", title: t("landing.steps.step2Title"), body: t("landing.steps.step2Body") },
    { step: "03", title: t("landing.steps.step3Title"), body: t("landing.steps.step3Body") },
  ];

  return (
    <section className="w-full bg-gradient-to-br from-[#ede4ff] via-[#e3edff] to-[#ddf6ee] py-20">
      <MotionStagger className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3 md:px-8">
        {steps.map((item, index) => {
          const look = STEP_LOOKS[index];
          return (
            <MotionItem key={item.step}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-[#12141c] bg-white text-center shadow-[5px_5px_0_0_#12141c]">
                <img src={look.art} alt="" className="aspect-video w-full object-cover" />
                <div className="flex flex-1 flex-col items-center p-8">
                  <span
                    className={`-mt-14 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#12141c] text-sm font-semibold ${look.badge}`}
                  >
                    {item.step}
                  </span>
                  <h2 className="mt-4 text-xl font-semibold text-zinc-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
                </div>
              </article>
            </MotionItem>
          );
        })}
      </MotionStagger>
    </section>
  );
}
