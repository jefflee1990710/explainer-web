"use client";

import { SignedInAccount } from "@/presentation/components/auth/signed-in-account";
import { GenerationDoneNotifier } from "@/presentation/components/app/tasks/generation-done-notifier";
import { queueBannerPending } from "@/presentation/components/app/tasks/queue-banner-copy";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { TaskQueueBanner } from "@/presentation/components/app/tasks/task-queue-banner";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioShell, type StudioNavItem } from "@/presentation/studio/studio-shell";
import { POSTS_FEATURE_ENABLED } from "@/service/post/feature";
import { SignupPromoBanner } from "@/presentation/components/signup-promo-banner";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
// Logged-in chrome. Page content sits in the studio shell.
export function AppShell({
  credits,
  creditLimit,
  activeTasks,
  email,
  name,
  avatarUrl,
  affiliateEnabled = false,
  signupDiscountPercent = 0,
  promoBonusPercent = 0,
  children,
}: {
  credits: number;
  creditLimit: number;
  // Generation tasks still queued or running (top banner).
  activeTasks: number;
  email: string;
  name: string;
  avatarUrl?: string;
  // Rail item only. The page and actions check the same user flag.
  affiliateEnabled?: boolean;
  // Permanent rate locked at signup. Zero when this account has no promo.
  signupDiscountPercent?: number;
  promoBonusPercent?: number;
  children: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const { tasks, loaded } = useTaskPoll(readCachedTasks() ?? [], undefined, true);
  const runningCount = queueBannerPending(
    tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length,
    loaded,
    activeTasks,
  );

  const items: StudioNavItem[] = [
    {
      href: "/app",
      label: locale === "zh-Hant" ? "Home 首頁" : locale === "zh-Hans" ? "Home 首页" : "Home",
      icon: "home",
      section: "home",
    },
    // TOOLS: Simple (#1) + existing creation tools (+ Life) in a 2-column grid
    {
      href: "/app/simple",
      label: locale === "zh-Hant" ? "Simple 極簡" : locale === "zh-Hans" ? "Simple 极简" : "Simple",
      icon: "projects",
      imageUrl: "/nav-tools/story.png",
      section: "create",
    },
    {
      href: "/app/explainers",
      label: locale === "zh-Hant" ? "解說" : locale === "zh-Hans" ? "解说" : "Explainer",
      icon: "projects",
      imageUrl: "/nav-tools/explainer.png",
      section: "create",
    },
    {
      href: "/app/talking-heads",
      label: locale === "zh-Hant" ? "口播" : locale === "zh-Hans" ? "口播" : "Talking",
      icon: "directors",
      imageUrl: "/nav-tools/talking.png",
      section: "create",
    },
    {
      href: "/app/stories",
      label: locale === "zh-Hant" ? "故事" : locale === "zh-Hans" ? "故事" : "Story",
      icon: "directors",
      imageUrl: "/nav-tools/story.png",
      section: "create",
    },
    {
      href: "/app/scroswap",
      label: locale === "zh-Hant" ? "換角" : locale === "zh-Hans" ? "换角" : "Swap",
      icon: "styles",
      imageUrl: "/nav-tools/swap.png",
      section: "create",
    },
    {
      href: "/app/teleport",
      label: locale === "zh-Hant" ? "換場" : locale === "zh-Hans" ? "换场" : "Teleport",
      icon: "room",
      imageUrl: "/nav-tools/teleport.png",
      section: "create",
    },
    ...(POSTS_FEATURE_ENABLED
      ? [
          {
            href: "/app/posts",
            label: locale === "en" ? "Poster" : t("nav.posts"),
            icon: "posts" as const,
            imageUrl: "/nav-tools/poster.png",
            section: "create" as const,
          },
        ]
      : []),
    {
      href: "/app/life",
      label: t("nav.life"),
      icon: "life",
      imageUrl: "/nav-tools/life.png",
      section: "create",
    },
    // CHARACTER & ASSETS
    { href: "/app/characters", label: t("nav.characters"), icon: "characters", section: "character" },
    { href: "/app/room", label: t("nav.room"), icon: "room", section: "character" },
    { href: "/app/wardrobe", label: t("nav.wardrobe"), icon: "wardrobe", section: "character" },
    { href: "/app/products", label: t("nav.products"), icon: "products", section: "assets" },
    {
      href: "/app/videos",
      label: locale === "en" ? "Video" : "影片庫 Video",
      icon: "videos",
      section: "assets",
    },
    {
      href: "/app/tasks",
      label: t("nav.tasks"),
      icon: "tasks",
      section: "assets",
      badge: runningCount,
    },
  ];

  return (
    <StudioShell
      items={items}
      banner={
        signupDiscountPercent > 0 ? (
          <SignupPromoBanner
            variant="locked"
            discountPercent={signupDiscountPercent}
            credits={WELCOME_CREDITS}
            bonusPercent={promoBonusPercent}
          />
        ) : null
      }
      headerEnd={<TaskQueueBanner initialPending={activeTasks} />}
      toolbar={
        <SignedInAccount
          email={email}
          name={name}
          avatarUrl={avatarUrl}
          signOutLabel={t("auth.signOut")}
          settingsLabel={t("nav.settings")}
          usageLabel={locale === "en" ? "Usage & Credits" : "用量與儲值 Usage"}
          billingLabel={locale === "en" ? "Billing & Card" : "信用卡與付款 Billing"}
          invoicesLabel={locale === "en" ? "Invoices" : "帳單紀錄 Invoices"}
          mcpLabel={t("nav.mcp")}
          affiliateLabel={affiliateEnabled ? t("nav.affiliate") : undefined}
          credits={credits}
          creditLimit={creditLimit}
          creditsLabel={t("common.credits")}
        />
      }
    >
      {children}
      <GenerationDoneNotifier />
    </StudioShell>
  );
}
