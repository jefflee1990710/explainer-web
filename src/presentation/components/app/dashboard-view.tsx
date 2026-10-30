"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideoCard } from "@/presentation/serialize";
import { OnboardingHeroCards } from "@/presentation/components/app/onboarding-hero-cards";
import { VideoTable } from "@/presentation/components/app/projects/[id]/video-table";
import { ProjectPicker, type ProjectOption } from "@/presentation/components/app/project-picker";
import { folderVideoPath } from "@/service/folder-video-path";

// /app lists videos directly. The project menu only filters; it is not a required step.
export function DashboardView({
  videos,
  folders,
  credits,
  subscribed,
}: {
  videos: PublicVideoCard[];
  folders: ProjectOption[];
  credits: number;
  subscribed: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("project") || "all";
  const [folderOptions, setFolderOptions] = useState(folders);
  const [filter, setFilter] = useState(
    initial === "none" || initial === "all" || folders.some((folder) => folder.id === initial) ? initial : "all",
  );

  const shown = useMemo(() => {
    if (filter === "none") return videos.filter((video) => !video.projectId);
    if (filter !== "all") return videos.filter((video) => video.projectId === filter);
    return videos;
  }, [filter, videos]);

  const newVideoHref =
    filter !== "all" && filter !== "none" ? folderVideoPath(filter) : "/app/videos/new";

  function selectFilter(next: string) {
    setFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("stay", "1");
    if (next === "all") params.delete("project");
    else params.set("project", next);
    router.replace(`/app?${params.toString()}`);
  }

  const newVideoLabel =
    locale === "zh-Hant" ? "新增影片" : locale === "zh-Hans" ? "新建视频" : "New video";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold">{t("dashboard.title")}</h1>
            <ProjectPicker
              includeAll
              folders={folderOptions}
              value={filter}
              onChange={selectFilter}
              onFolderCreated={(folder) => setFolderOptions((current) => [folder, ...current])}
            />
          </div>
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
        <Link
          href={newVideoHref}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent-ink px-5 text-sm font-semibold text-lime shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5"
        >
          {newVideoLabel}
        </Link>
      </div>

      {!subscribed && credits <= 0 ? (
        <div className="mt-6 rounded-lg bg-[var(--studio-cyan-soft)] px-4 py-3 text-sm">
          {t("dashboard.noSubscriptionBanner")}
          <Link href="/app/billing" className="ml-2 font-semibold underline">
            {t("dashboard.goBilling")}
          </Link>
        </div>
      ) : null}

      {videos.length === 0 ? <OnboardingHeroCards /> : null}

      <div className="mt-8">
        <VideoTable videos={shown} />
      </div>
    </div>
  );
}
