"use client";

import { SignedInAccount } from "@/presentation/components/auth/signed-in-account";
import { GenerationDoneNotifier } from "@/presentation/components/app/tasks/generation-done-notifier";
import { TaskQueueBanner } from "@/presentation/components/app/tasks/task-queue-banner";
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
  const { t } = useI18n();
  const items: StudioNavItem[] = [
    { href: "/app", label: t("nav.projects"), icon: "projects", section: "create" },
    { href: "/app/life", label: t("nav.life"), icon: "life", section: "create" },
    ...(POSTS_FEATURE_ENABLED
      ? [{ href: "/app/posts", label: t("nav.posts"), icon: "posts" as const, section: "create" as const }]
      : []),
    { href: "/app/characters", label: t("nav.characters"), icon: "characters", section: "character" },
    { href: "/app/room", label: t("nav.room"), icon: "room", section: "character" },
    { href: "/app/wardrobe", label: t("nav.wardrobe"), icon: "wardrobe", section: "character" },
    { href: "/app/text-styles", label: t("nav.textStyles"), icon: "text", section: "assets" },
    { href: "/app/products", label: t("nav.products"), icon: "products", section: "assets" },
    { href: "/app/billing", label: t("nav.billing"), icon: "billing", section: "account" },
    { href: "/app/mcp", label: t("nav.mcp"), icon: "mcp", section: "account" },
    ...(affiliateEnabled
      ? [{ href: "/app/affiliate", label: t("nav.affiliate"), icon: "affiliate" as const, section: "account" as const }]
      : []),
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
