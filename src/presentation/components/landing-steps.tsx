"use client";

import { canvasLaunchHref } from "@/presentation/components/canvas-launch-href";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { CardCta, SectionCtaRow } from "@/presentation/components/section-cta-row";

// Fresh-cast marketing stills (no account library faces): character → Canvas workflow → finished reel.
const STEP_ART = [
  "/landing/steps/character.webp",
  "/landing/steps/life.webp",
  "/landing/steps/video.webp",
] as const;

export function LandingSteps({ signedIn = false }: { signedIn?: boolean }) {
  const { t, locale } = useI18n();
  const isZhHant = locale === "zh-Hant";
  const isZhHans = locale === "zh-Hans";
  const steps = [
    {
      step: "01",
      title: isZhHant ? "揀範本或問 AI 助理" : isZhHans ? "选模板或问 AI 助理" : "Pick a Template or Ask AI",
      body: isZhHant
        ? "不用由零開始摸索設定，直接選擇現成範本，或者用一句廣東話／中文話俾 AI 助理知你想整咩片。"
        : isZhHans
          ? "不用从零摸索配置，直接挑选现成模板，或用一句话告诉 AI 助理你想做什么视频。"
          : "Skip technical setup—pick one of 6 ready-made workflows or describe your idea to the free Canvas AI Assistant.",
      href: canvasLaunchHref(signedIn),
      cta: isZhHant ? "打開 Canvas" : isZhHans ? "打开 Canvas" : "Open Canvas",
    },
    {
      step: "02",
      title: isZhHant ? "拖入角色、產品或影片" : isZhHans ? "拖入角色、产品或视频" : "Drop Your Character or Clip",
      body: t("landing.steps.step1Body"),
      href: signedIn ? "/app/characters" : "/sign-up?next=%2Fapp%2Fcharacters",
      cta: t("landing.cast.cta"),
    },
    {
      step: "03",
      title: isZhHant ? "一撳 Run Flow 自動成片" : isZhHans ? "一键 Run Flow 自动成片" : "Click Run Flow & Download",
      body: isZhHant
        ? "雲端自動幫你配音、生片、換角同串接混音；就算閂咗瀏覽器都會喺背景跑晒，返嚟直接下載 MP4。"
        : isZhHans
          ? "云端自动帮你配音、出片、换角与拼接混音；就算关掉浏览器也会在后台跑完，回来直接下载 MP4。"
          : "Cloud automation handles voiceover, rendering, merging, and audio mixing in the background—even if you close your tab.",
      href: canvasLaunchHref(signedIn, "talking-head"),
      cta: isZhHant ? "試用口播範本" : isZhHans ? "试用口播模板" : "Try Talking Head",
    },
  ];

  return (
    <section className="w-full border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("landing.steps.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("landing.steps.title")}
          </h2>
        </div>
        <MotionStagger className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item, index) => (
            <MotionItem key={item.step}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4e4e7] bg-[#fafafa] text-center transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
                {/* Fresh-cast stills in a 16:9 frame; cover fills the card cleanly. */}
                <img
                  src={STEP_ART[index]}
                  alt=""
                  className="aspect-video w-full border-b border-[#e4e4e7] bg-[#f4f4f5] object-cover"
                />
                <div className="flex flex-1 flex-col items-center p-5 sm:p-8">
                  <span className="-mt-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e4e7] bg-[#12141c] text-xs font-bold text-[#c6f24b] sm:-mt-14">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
                  <CardCta href={item.href} label={item.cta} />
                </div>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
        <SectionCtaRow
          align="center"
          primary={{
            href: signedIn ? "/app/characters" : "/sign-up",
            label: signedIn ? t("landing.hero.ctaWorkspace") : t("landing.hero.ctaStart"),
          }}
          secondary={{ href: "/pricing", label: t("landing.freeCredit.ctaPricing") }}
        />
      </div>
    </section>
  );
}
