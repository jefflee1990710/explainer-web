"use client";

import { SignedInAccount } from "@/presentation/components/auth/signed-in-account";
import { TaskQueueBanner } from "@/presentation/components/app/tasks/task-queue-banner";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioShell, type StudioNavItem } from "@/presentation/studio/studio-shell";
// Logged-in chrome. Page content sits in the studio shell.
export function AppShell({
  credits,
  creditLimit,
  activeTasks,
  email,
  name,
  avatarUrl,
  affiliateEnabled = false,
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
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const items: StudioNavItem[] = [
    { href: "/app", label: t("nav.projects"), icon: "projects" },
    { href: "/app/characters", label: t("nav.characters"), icon: "characters" },
    { href: "/app/mcp", label: t("nav.mcp"), icon: "mcp" },
    { href: "/app/billing", label: t("nav.billing"), icon: "billing" },
  ];
  if (affiliateEnabled) {
    items.splice(3, 0, { href: "/app/affiliate", label: t("nav.affiliate"), icon: "affiliate" });
  }

  return (
    <StudioShell
      items={items}
      credits={credits}
      creditLimit={creditLimit}
      creditsLabel={t("common.credits")}
      headerEnd={<TaskQueueBanner initialPending={activeTasks} />}
      toolbar={
        <SignedInAccount
          email={email}
          name={name}
          avatarUrl={avatarUrl}
          signOutLabel={t("auth.signOut")}
          settingsLabel={t("nav.settings")}
        />
      }
    >
      {children}
    </StudioShell>
  );
}
