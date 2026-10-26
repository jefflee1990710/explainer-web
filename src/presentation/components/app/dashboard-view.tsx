"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicFolder } from "@/presentation/serialize";
import { CreateFolderButton } from "@/presentation/components/app/create-folder-modal";
import { OnboardingHeroCards } from "@/presentation/components/app/onboarding-hero-cards";
import { ProjectGrid } from "@/presentation/components/app/project-grid";
import { StartFirstVideoButton } from "@/presentation/components/app/start-first-video-button";

// Client shell for the dashboard so copy follows the UI locale.
export function DashboardView({
  folders,
  credits,
  subscribed,
}: {
  folders: PublicFolder[];
  credits: number;
  subscribed: boolean;
}) {
  const { t, locale } = useI18n();
  const totalVideos = folders.reduce((sum, folder) => sum + folder.videoCount, 0);
  const firstFolderId = folders[0]?.id;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("dashboard.title")}</h1>
          <p className="mt-2 text-sm text-muted">
            {subscribed
              ? t("dashboard.subscribed", { credits })
              : credits > 0
                ? locale === "zh-Hant"
                  ? `目前已領取 ${credits} 免費體驗 credits（可直接用於免費寫分鏡、建立角色、拍 Life 日常照與產生場景圖）。`
                  : locale === "zh-Hans"
                    ? `目前已领取 ${credits} 免费体验 credits（可直接用于免费写分镜、创建角色、拍 Life 日常照与生成场景图）。`
                    : `You have ${credits} free trial credits ready to draft storyboards, create characters, snap Life photos, and generate scene frames.`
                : t("dashboard.notSubscribed")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {totalVideos === 0 ? (
            <StartFirstVideoButton existingFolderId={firstFolderId} />
          ) : null}
          <CreateFolderButton>{t("folder.create")}</CreateFolderButton>
        </div>
      </div>

      {!subscribed && credits <= 0 ? (
        <div className="mt-6 rounded-lg bg-[var(--studio-cyan-soft)] px-4 py-3 text-sm">
          {t("dashboard.noSubscriptionBanner")}
          <Link href="/app/billing" className="ml-2 font-semibold underline">
            {t("dashboard.goBilling")}
          </Link>
        </div>
      ) : null}

      {totalVideos === 0 ? (
        <OnboardingHeroCards existingFolderId={firstFolderId} />
      ) : null}

      <div className="mt-8">
        <ProjectGrid folders={folders} />
      </div>
    </div>
  );
}
