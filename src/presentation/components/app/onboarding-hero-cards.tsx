"use client";

import Link from "next/link";
import { track } from "@/presentation/components/analytics/track";
import { StartFirstVideoButton } from "@/presentation/components/app/start-first-video-button";
import { useI18n } from "@/presentation/components/i18n-provider";

// Three-option onboarding hero shown on `/app` when the user has not generated a video yet.
export function OnboardingHeroCards({
  existingFolderId,
}: {
  existingFolderId?: string;
}) {
  const { locale } = useI18n();

  const copy =
    locale === "zh-Hant"
      ? {
          badge: "新手快速開始 · 已內建 5 位現成 AI 角色",
          heading: "你想先體驗哪一個創作流程？",
          card1Tag: "0 Credits 免費寫分鏡",
          card1Title: "🎬 30 秒做出第一支 AI 短片",
          card1Body:
            "不用先自己建角色！系統已預選現成角色（Aera）與 9:16 短片規格，輸入一句話或點選範例腳本即可產出分鏡。",
          card1Cta: "立即製作第一支短片 →",
          card2Tag: "8 Credits / 角色藍圖",
          card2Title: "🧑 打造專屬 AI 角色 / 網紅",
          card2Body:
            "自由搭配臉型、髮型、服裝與誇張比例，或上傳照片定裝，建立可在所有短片重複登場的專屬角色。",
          card2Cta: "前往建立新角色 →",
          card3Tag: "4 Credits / 日常寫真",
          card3Title: "📸 拍一張 AI 網紅日常照 (Life)",
          card3Body:
            "門檻最低、幾秒鐘出圖！直接選用現成角色套用街拍、咖啡廳或旅遊模板，立即產出 IG 級生活照。",
          card3Cta: "前往拍 Life 日常照 →",
        }
      : locale === "zh-Hans"
        ? {
            badge: "新手快速开始 · 已内置 5 位现成 AI 角色",
            heading: "你想先体验哪一个创作流程？",
            card1Tag: "0 Credits 免费写分镜",
            card1Title: "🎬 30 秒做出第一支 AI 短片",
            card1Body:
              "不用先自己建角色！系统已预选现成角色（Aera）与 9:16 短片规格，输入一句话或点击示例脚本即可生成分镜。",
            card1Cta: "立即制作第一支短片 →",
            card2Tag: "8 Credits / 角色蓝图",
            card2Title: "🧑 打造专属 AI 角色 / 网红",
            card2Body:
              "自由搭配脸型、发型、服装与夸张比例，或上传照片定装，创建可在所有短片重复登场的专属角色。",
            card2Cta: "前往创建新角色 →",
            card3Tag: "4 Credits / 日常写真",
            card3Title: "📸 拍一张 AI 网红日常照 (Life)",
            card3Body:
              "门槛最低、几秒钟出图！直接选用现成角色套用街拍、咖啡厅或旅游模板，立即生成 IG 级生活照。",
            card3Cta: "前往拍 Life 日常照 →",
          }
        : {
            badge: "Quick Start · 5 Starter AI Characters Included",
            heading: "How would you like to start creating?",
            card1Tag: "0 Credits for Storyboard",
            card1Title: "🎬 Make Your First AI Video in 30s",
            card1Body:
              "No need to build a character first! Starter character Aera and 9:16 vertical specs are pre-selected—just type one sentence or pick a sample script.",
            card1Cta: "Create First Video →",
            card2Tag: "8 Credits / Blueprint",
            card2Title: "🧑 Design Your Custom AI Character",
            card2Body:
              "Mix and match face, hair, outfits, and exaggeration levels—or upload a reference photo—to create a reusable AI influencer.",
            card2Cta: "Create Character →",
            card3Tag: "4 Credits / Photo",
            card3Title: "📸 Snap an AI Influencer Life Photo",
            card3Body:
              "Fastest way to see results! Pick a ready character and a lifestyle template to generate an Instagram-ready photo in seconds.",
            card3Cta: "Try Life Studio →",
          };

  return (
    <section
      aria-label={copy.heading}
      className="mt-6 rounded-[1.75rem] border border-accent-ink/12 bg-white p-5 shadow-[6px_6px_0_0_rgba(18,20,28,0.06)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-block rounded-full bg-lime px-3 py-0.5 font-display text-xs font-bold text-accent-ink">
            {copy.badge}
          </span>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground">
            {copy.heading}
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* Card 1: Instant First Video */}
        <div className="flex flex-col justify-between rounded-2xl border border-accent-ink bg-paper/70 p-4 shadow-[3px_3px_0_0_#12141c]">
          <div>
            <span className="inline-block rounded-full bg-accent-ink px-2.5 py-0.5 text-[11px] font-bold text-lime">
              {copy.card1Tag}
            </span>
            <h3 className="mt-2.5 font-display text-base font-bold text-foreground">
              {copy.card1Title}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              {copy.card1Body}
            </p>
          </div>
          <div className="mt-4">
            <StartFirstVideoButton
              existingFolderId={existingFolderId}
              className="inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent-ink px-4 py-2 text-xs font-bold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {copy.card1Cta}
            </StartFirstVideoButton>
          </div>
        </div>

        {/* Card 2: Build Custom AI Character */}
        <div className="flex flex-col justify-between rounded-2xl border border-accent-ink/15 bg-paper/50 p-4 transition hover:border-accent-ink/40">
          <div>
            <span className="inline-block rounded-full bg-accent-ink/8 px-2.5 py-0.5 text-[11px] font-bold text-foreground">
              {copy.card2Tag}
            </span>
            <h3 className="mt-2.5 font-display text-base font-bold text-foreground">
              {copy.card2Title}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              {copy.card2Body}
            </p>
          </div>
          <div className="mt-4">
            <Link
              href="/app/characters/generate"
              onClick={() =>
                track("onboarding_hero_character_click", {
                  destination: "/app/characters/generate",
                })
              }
              className="inline-flex min-h-[42px] w-full items-center justify-center rounded-full border border-accent-ink/20 bg-white px-4 py-2 text-xs font-bold text-foreground transition hover:-translate-y-0.5 hover:border-accent-ink"
            >
              {copy.card2Cta}
            </Link>
          </div>
        </div>

        {/* Card 3: Snap Life Photo */}
        <div className="flex flex-col justify-between rounded-2xl border border-accent-ink/15 bg-paper/50 p-4 transition hover:border-accent-ink/40">
          <div>
            <span className="inline-block rounded-full bg-accent-ink/8 px-2.5 py-0.5 text-[11px] font-bold text-foreground">
              {copy.card3Tag}
            </span>
            <h3 className="mt-2.5 font-display text-base font-bold text-foreground">
              {copy.card3Title}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              {copy.card3Body}
            </p>
          </div>
          <div className="mt-4">
            <Link
              href="/app/life"
              onClick={() =>
                track("onboarding_hero_life_click", {
                  destination: "/app/life",
                })
              }
              className="inline-flex min-h-[42px] w-full items-center justify-center rounded-full border border-accent-ink/20 bg-white px-4 py-2 text-xs font-bold text-foreground transition hover:-translate-y-0.5 hover:border-accent-ink"
            >
              {copy.card3Cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
