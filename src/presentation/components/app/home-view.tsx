"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_HOT_TOPICS, type HotTopicItem } from "@/model/hot-topic";
import { getOrGenerateUserHotTopicsAction } from "@/presentation/actions/hot-topics";
import { useI18n } from "@/presentation/components/i18n-provider";
import { InlineCreateCharacterDialog } from "@/presentation/components/app/projects/[id]/inline-create-character-dialog";
import { VideoGridCard } from "@/presentation/components/app/projects/[id]/video-grid-card";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicStyle,
  PublicVideoCard,
} from "@/presentation/serialize";
import { videoListStage } from "@/service/video/list-stage";

export function HomeView({
  videos,
  characters,
  styles,
  credits,
  subscribed,
  initialHotTopics,
  hotTopicsNeedRefresh = false,
}: {
  videos: PublicVideoCard[];
  characters: PublicCharacter[];
  styles: PublicStyle[];
  credits: number;
  subscribed: boolean;
  initialHotTopics?: HotTopicItem[];
  hotTopicsNeedRefresh?: boolean;
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const [createCharOpen, setCreateCharOpen] = useState(false);
  const [localCharacters, setLocalCharacters] = useState<PublicCharacter[]>(characters);
  const [postedIds, setPostedIds] = useState<Record<string, string>>({});
  const [archivedIds, setArchivedIds] = useState<Record<string, string | null>>({});
  const [hotTopics, setHotTopics] = useState<HotTopicItem[]>(
    () => (initialHotTopics && initialHotTopics.length >= 3 ? initialHotTopics : [...DEFAULT_HOT_TOPICS]),
  );
  const [loadingHotTopics, setLoadingHotTopics] = useState(hotTopicsNeedRefresh);

  // Lazy-load 4-hour personalized LLM hot topics based on user's recent generated content
  useEffect(() => {
    if (!hotTopicsNeedRefresh) return;
    let cancelled = false;
    void getOrGenerateUserHotTopicsAction()
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.topics.length >= 3) {
          setHotTopics(res.topics);
        }
      })
      .catch(() => {
        // Fallback topics remain visible
      })
      .finally(() => {
        if (!cancelled) setLoadingHotTopics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hotTopicsNeedRefresh]);

  async function handleRefreshHotTopics() {
    if (loadingHotTopics) return;
    setLoadingHotTopics(true);
    try {
      const res = await getOrGenerateUserHotTopicsAction({ forceRefresh: true });
      if (res.ok && res.topics.length >= 3) {
        setHotTopics(res.topics);
      }
    } finally {
      setLoadingHotTopics(false);
    }
  }

  const recentVideos = videos.slice(0, 4);
  const displayCharacters = localCharacters.slice(0, 6);

  const copy =
    locale === "zh-Hant"
      ? {
          welcomeBadge: "BUILD YOUR AI CREATOR IP, THEN PUT THEM EVERYWHERE",
          heroTitle: "Build Your AI Creator IP, Then Put Them Everywhere.",
          heroSubtitle:
            "養一個鎖臉鎖聲的專屬 AI 角色 IP —— 一站式包辦「拍新片 Create Video」、「改片特效 Remix Video」與「日常圖文 Social Image」。",
          shortcutsTitle: "精選創作工具 · Featured Creation Tools",
          tool1Tag: "STORYBOARD & VOICE",
          tool1Title: "Explainer 解說短片",
          tool1Desc: "輸入主題或文章，AI 導演自動規劃分鏡、配音與剪紙／白板視覺動畫。",
          tool1Cta: "開始製作解說片 →",
          tool2Tag: "1080P LIP-SYNC",
          tool2Title: "Talking 對鏡口播",
          tool2Desc: "輸入講稿或上傳錄音，一鍵生成自然眼神、微表情與嘴型同步的真人開講短片。",
          tool2Cta: "開始製作口播片 →",
          tool3Tag: "MOTION & RELIGHT",
          tool3Title: "Swap 角色換角",
          tool3Desc: "上傳任何實拍動作片，瞬間替換為你的 AI 網紅角色並完美保留肢體律動與光影。",
          tool3Cta: "立即體驗換角 →",
          influencerTitle: "AI 網紅工作室 · AI Influencer Studio",
          influencerSubtitle:
            "立即建立全新的專屬 AI 網紅角色（支援相片定裝或文字描述），或自訂 1x–10x 造型比例與專屬衣櫥。",
          quickCreateBtn: "+ 立即建立 AI 網紅",
          customGeneratorBtn: "進階造型產生器",
          viewAllCharacters: "管理全部角色 →",
          recentVideosTitle: "最近製作短片 · Recent Videos",
          viewAllVideos: "查看全部短片 →",
          emptyVideosTitle: "尚無近期短片",
          emptyVideosDesc: "點選上方工具或下方熱門主題，30 秒內產出你的第一支 AI 短片！",
          hotTopicsTitle: "熱門爆款主題 · Hot Topics to Start Generating",
          hotTopicsSubtitle: "AI 根據你近期生成的內容（每 4 小時自動更新），為你量身推薦高留存率短片題材：",
          refreshTopicsLabel: "重新推薦主題",
          generatingTopicsLabel: "AI 正在根據你的近期作品分析熱門主題…",
          startTopicCta: "立即生成短片 →",
        }
      : locale === "zh-Hans"
        ? {
            welcomeBadge: "BUILD YOUR AI CREATOR IP, THEN PUT THEM EVERYWHERE",
            heroTitle: "Build Your AI Creator IP, Then Put Them Everywhere.",
            heroSubtitle:
              "养一个锁脸锁声的专属 AI 角色 IP —— 一站式包办「拍新片 Create Video」、「改片特效 Remix Video」与「日常图文 Social Image」。",
            shortcutsTitle: "精选创作工具 · Featured Creation Tools",
            tool1Tag: "STORYBOARD & VOICE",
            tool1Title: "Explainer 解说短片",
            tool1Desc: "输入主题或文章，AI 导演自动规划分镜、配音与剪纸／白板视觉动画。",
            tool1Cta: "开始制作解说片 →",
            tool2Tag: "1080P LIP-SYNC",
            tool2Title: "Talking 对镜口播",
            tool2Desc: "输入讲稿或上传录音，一键生成自然眼神、微表情与嘴型同步的真人开讲短片。",
            tool2Cta: "开始制作口播片 →",
            tool3Tag: "MOTION & RELIGHT",
            tool3Title: "Swap 角色换角",
            tool3Desc: "上传任何实拍动作片，瞬间替换为你的 AI 网红角色并完美保留肢体律动与光影。",
            tool3Cta: "立即体验换角 →",
            influencerTitle: "AI 网红工作室 · AI Influencer Studio",
            influencerSubtitle:
              "立即创建全新的专属 AI 网红角色（支持照片定装或文字描述），或自定义 1x–10x 造型比例与专属衣橱。",
            quickCreateBtn: "+ 立即创建 AI 网红",
            customGeneratorBtn: "进阶造型生成器",
            viewAllCharacters: "管理全部角色 →",
            recentVideosTitle: "最近制作短片 · Recent Videos",
            viewAllVideos: "查看全部短片 →",
            emptyVideosTitle: "暂无近期短片",
            emptyVideosDesc: "点击上方工具或下方热门主题，30 秒内生成你的第一支 AI 短片！",
            hotTopicsTitle: "热门爆款主题 · Hot Topics to Start Generating",
            hotTopicsSubtitle: "AI 根据你近期生成的内容（每 4 小时自动更新），为你量身推荐高留存率短片题材：",
            refreshTopicsLabel: "换一批主题",
            generatingTopicsLabel: "AI 正在根据你的近期作品分析热门主题…",
            startTopicCta: "立即生成短片 →",
          }
        : {
            welcomeBadge: "BUILD YOUR AI CREATOR IP, THEN PUT THEM EVERYWHERE",
            heroTitle: "Build Your AI Creator IP, Then Put Them Everywhere.",
            heroSubtitle:
              "Lock one AI character face, voice, and wardrobe — then Create Video, Remix Video, and publish Daily Social Images from one studio.",
            shortcutsTitle: "Featured Creation Tools",
            tool1Tag: "STORYBOARD & VOICE",
            tool1Title: "Explainer Video",
            tool1Desc: "Turn any topic or script into multi-scene animated explainers with AI voiceover and captions.",
            tool1Cta: "Create Explainer →",
            tool2Tag: "1080P LIP-SYNC",
            tool2Title: "Talking Video",
            tool2Desc: "Type a script or upload audio to generate natural lip-sync talking-head reels with your creator.",
            tool2Cta: "Create Talking Video →",
            tool3Tag: "MOTION & RELIGHT",
            tool3Title: "Swap",
            tool3Desc: "Swap any real-world motion video into your AI character while preserving lighting and rhythm.",
            tool3Cta: "Open Swap →",
            influencerTitle: "AI Influencer Studio",
            influencerSubtitle:
              "Quickly create a brand-new AI Influencer from a photo or text prompt, or customize outfits in the look generator.",
            quickCreateBtn: "+ Quick Create AI Influencer",
            customGeneratorBtn: "Look Generator",
            viewAllCharacters: "All Characters →",
            recentVideosTitle: "Recent Videos",
            viewAllVideos: "View All Videos →",
            emptyVideosTitle: "No recent videos yet",
            emptyVideosDesc: "Pick a creation tool above or click any Hot Topic below to generate your first video!",
            hotTopicsTitle: "Hot Topics to Start Generating",
            hotTopicsSubtitle:
              "AI-tailored topic ideas based on your recently generated content (refreshed every 4 hours):",
            refreshTopicsLabel: "Refresh Topics",
            generatingTopicsLabel: "Curating personalized hot topics from your recent creations…",
            startTopicCta: "Start Generating →",
          };

  const toolShortcuts = [
    {
      href: "/app/explainers",
      tag: copy.tool1Tag,
      title: copy.tool1Title,
      desc: copy.tool1Desc,
      cta: copy.tool1Cta,
      imageUrl: "/home/tool-explainer.png",
    },
    {
      href: "/app/talking-heads",
      tag: copy.tool2Tag,
      title: copy.tool2Title,
      desc: copy.tool2Desc,
      cta: copy.tool2Cta,
      imageUrl: "/home/tool-talking.png",
    },
    {
      href: "/app/scroswap",
      tag: copy.tool3Tag,
      title: copy.tool3Title,
      desc: copy.tool3Desc,
      cta: copy.tool3Cta,
      imageUrl: "/home/tool-swap.png",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-12">
      {/* Top Hero Banner */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 px-3 py-0.5 font-display text-[11px] font-extrabold tracking-wider text-[var(--studio-ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
            {copy.welcomeBadge}
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--studio-ink)] sm:text-4xl">
            {copy.heroTitle}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--studio-muted)]">
            {copy.heroSubtitle}
          </p>
        </div>
      </header>

      {/* 1. Shortcut for 3 Creation Tools (Seedream 5.0 Pro Previews) */}
      <section aria-label={copy.shortcutsTitle} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--studio-ink)]">
            {copy.shortcutsTitle}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {toolShortcuts.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="studio-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c6f24b]/60"
            >
              <div>
                <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl border border-[var(--studio-line)] bg-[#12141c]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tool.imageUrl}
                    alt={tool.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-[#12141c]/90 px-2.5 py-0.5 font-display text-[10px] font-extrabold tracking-wider text-[#c6f24b] backdrop-blur-xs">
                    {tool.tag}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-[var(--studio-ink)]">
                  {tool.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-[var(--studio-muted)]">
                  {tool.desc}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--studio-line)] pt-3 text-xs font-bold text-[var(--studio-ink)] group-hover:text-[#c6f24b]">
                <span>{tool.cta}</span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#c6f24b] text-[#12141c] transition group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. AI Influencer Quick Create Section */}
      <section
        aria-label={copy.influencerTitle}
        className="rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#c6f24b] text-xs font-extrabold text-[#12141c]">
                ✦
              </span>
              <h2 className="font-display text-lg font-bold text-[var(--studio-ink)]">
                {copy.influencerTitle}
              </h2>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-[var(--studio-muted)] sm:text-sm">
              {copy.influencerSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCreateCharOpen(true)}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#c6f24b] px-4 py-2 font-display text-xs font-extrabold text-[#12141c] shadow-xs transition hover:bg-[#b6e23a]"
            >
              {copy.quickCreateBtn}
            </button>
            <Link
              href="/app/characters/generate"
              className="inline-flex min-h-10 items-center rounded-xl border border-[var(--studio-line)] bg-[var(--studio-fill)] px-3.5 py-2 text-xs font-bold text-[var(--studio-ink)] transition hover:border-[#c6f24b]/60"
            >
              {copy.customGeneratorBtn}
            </Link>
            <Link
              href="/app/characters"
              className="inline-flex min-h-10 items-center px-2 text-xs font-semibold text-[var(--studio-muted)] transition hover:text-[var(--studio-ink)]"
            >
              {copy.viewAllCharacters}
            </Link>
          </div>
        </div>

        {/* Quick Create Card + Existing AI Influencers Strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          <button
            type="button"
            onClick={() => setCreateCharOpen(true)}
            className="group flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#c6f24b]/55 bg-[var(--studio-fill)]/60 p-3 text-center transition hover:border-[#c6f24b] hover:bg-[var(--studio-fill)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#c6f24b] text-xl font-extrabold text-[#12141c] transition group-hover:scale-105">
              +
            </span>
            <span className="font-display text-xs font-bold text-[var(--studio-ink)]">
              {locale === "en" ? "New AI Influencer" : "新增 AI 網紅"}
            </span>
            <span className="text-[10px] text-[var(--studio-muted)]">
              {locale === "en" ? "Photo or Text" : "相片或文字定裝"}
            </span>
          </button>

          {displayCharacters.map((char) => (
            <Link
              key={char.id}
              href={`/app/room/${char.id}`}
              className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl border border-[var(--studio-line)] bg-[#12141c] transition hover:border-[#c6f24b]/70"
            >
              {char.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={char.previewUrl}
                  alt={char.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <div className="relative z-10 p-2.5">
                <p className="truncate font-display text-xs font-bold text-white">
                  {char.name}
                </p>
                <p className="truncate text-[10px] text-white/70">
                  {locale === "en" ? "Open Studio →" : "進入角色空間 →"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Recent Videos Section */}
      <section aria-label={copy.recentVideosTitle} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[var(--studio-ink)]">
            {copy.recentVideosTitle}
          </h2>
          <Link
            href="/app/videos"
            className="text-xs font-bold text-[var(--studio-muted)] transition hover:text-[var(--studio-ink)]"
          >
            {copy.viewAllVideos}
          </Link>
        </div>

        {recentVideos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--studio-line)] bg-[var(--studio-panel)] p-8 text-center">
            <p className="font-display text-base font-bold text-[var(--studio-ink)]">
              {copy.emptyVideosTitle}
            </p>
            <p className="mt-1 text-xs text-[var(--studio-muted)]">
              {copy.emptyVideosDesc}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentVideos.map((video) => {
              const stage = videoListStage({
                status: video.status,
                tags: video.tags,
                postedAt: postedIds[video.id] || video.postedAt,
                archivedAt:
                  archivedIds[video.id] !== undefined
                    ? archivedIds[video.id] ?? undefined
                    : video.archivedAt,
              });
              return (
                <VideoGridCard
                  key={video.id}
                  folderId={video.projectId || ""}
                  video={video}
                  stage={stage}
                  onPosted={(id) =>
                    setPostedIds((current) => ({
                      ...current,
                      [id]: new Date().toISOString(),
                    }))
                  }
                  onArchived={(id) =>
                    setArchivedIds((current) => ({
                      ...current,
                      [id]: new Date().toISOString(),
                    }))
                  }
                  onUnarchived={(id) =>
                    setArchivedIds((current) => ({ ...current, [id]: null }))
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Hot Topics to Start Generating (4-hour LLM lazy loading based on user recent creations) */}
      <section aria-label={copy.hotTopicsTitle} className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-[var(--studio-ink)]">
                {copy.hotTopicsTitle}
              </h2>
              {loadingHotTopics ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--studio-fill)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--studio-muted)]">
                  <Spinner className="h-3 w-3 text-[#c6f24b]" />
                  <span>{copy.generatingTopicsLabel}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-muted)] sm:text-sm">
              {copy.hotTopicsSubtitle}
            </p>
          </div>

          <button
            type="button"
            disabled={loadingHotTopics}
            onClick={() => void handleRefreshHotTopics()}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--studio-line)] bg-[var(--studio-fill)] px-3 text-xs font-bold text-[var(--studio-ink)] transition hover:border-[#c6f24b]/60 disabled:opacity-50"
          >
            {loadingHotTopics ? <Spinner className="h-3.5 w-3.5 text-[#c6f24b]" /> : null}
            <span>{copy.refreshTopicsLabel}</span>
          </button>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {hotTopics.map((topic) => {
            const title =
              locale === "zh-Hant"
                ? topic.titleZhHant
                : locale === "zh-Hans"
                  ? topic.titleZhHans
                  : topic.titleEn;
            const desc =
              locale === "zh-Hant"
                ? topic.descZhHant
                : locale === "zh-Hans"
                  ? topic.descZhHans
                  : topic.descEn;
            const promptText =
              locale === "zh-Hant"
                ? topic.promptZhHant
                : locale === "zh-Hans"
                  ? topic.promptZhHans
                  : topic.promptEn;
            const baseRoute =
              topic.useCase === "talking-head"
                ? "/app/talking-heads"
                : topic.useCase === "story"
                  ? "/app/stories"
                  : "/app/explainers";
            const href = `${baseRoute}?prompt=${encodeURIComponent(promptText)}`;

            return (
              <Link
                key={topic.id}
                href={href}
                className="studio-card group flex flex-col justify-between rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#c6f24b]/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--studio-muted)]">
                      {topic.category}
                    </span>
                    <span className="rounded-full bg-[#c6f24b]/15 px-2.5 py-0.5 text-[10px] font-bold text-[var(--studio-ink)]">
                      {topic.badge}
                    </span>
                  </div>

                  <h3 className="mt-2.5 font-display text-base font-bold text-[var(--studio-ink)]">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--studio-muted)]">
                    {desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--studio-line)] pt-3 text-xs font-bold text-[var(--studio-ink)]">
                  <span className="rounded-lg bg-[var(--studio-fill)] px-2 py-0.5 text-[10px] font-semibold text-[var(--studio-muted)]">
                    {topic.useCase === "talking-head"
                      ? locale === "en"
                        ? "Talking"
                        : "對鏡口播"
                      : topic.useCase === "story"
                        ? locale === "en"
                          ? "Story"
                          : "故事短劇"
                        : locale === "en"
                          ? "Explainer"
                          : "解說短片"}
                  </span>
                  <span className="inline-flex items-center gap-1 group-hover:text-[#c6f24b]">
                    {copy.startTopicCta}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {createCharOpen ? (
        <InlineCreateCharacterDialog
          styles={styles}
          credits={credits}
          subscribed={subscribed}
          onClose={() => setCreateCharOpen(false)}
          onCreated={(created) => {
            setLocalCharacters((prev) => [created, ...prev]);
            setCreateCharOpen(false);
            router.push(`/app/characters/${created.id}`);
          }}
        />
      ) : null}
    </div>
  );
}
