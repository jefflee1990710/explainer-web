"use client";

import { SignOutButton } from "@/presentation/components/auth/sign-out-button";
import { LanguageSwitcher } from "@/presentation/components/language-switcher";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioShell, type StudioNavItem } from "@/presentation/studio/studio-shell";
import { TaskMeter } from "@/presentation/studio/task-meter";
import { AFFILIATE_ENABLED } from "@/service/affiliate/enabled";

// Logged-in chrome. Page content sits in the studio shell.
export function AppShell({
  credits,
  creditLimit,
  activeTasks,
  children,
}: {
  credits: number;
  creditLimit: number;
  // Generation tasks still queued or running (header meter).
  activeTasks: number;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const items: StudioNavItem[] = [
    { href: "/app", label: t("nav.projects"), icon: "projects" },
    { href: "/app/characters", label: t("nav.characters"), icon: "characters" },
    { href: "/app/mcp", label: t("nav.mcp"), icon: "mcp" },
    { href: "/app/billing", label: t("nav.billing"), icon: "billing" },
  ];
  if (AFFILIATE_ENABLED) {
    items.splice(3, 0, { href: "/app/affiliate", label: t("nav.affiliate"), icon: "affiliate" });
  }

  return (
    <StudioShell
      items={items}
      credits={credits}
      creditLimit={creditLimit}
      creditsLabel={t("common.credits")}
      headerEnd={
        <TaskMeter
          pending={activeTasks}
          tasksLabel={t("nav.tasks")}
          pendingLabel={t("common.pending")}
        />
      }
      toolbar={
        <>
          {/* Narrow rail: globe icon with an invisible select over it */}
          <LanguageSwitcher
            className="relative w-full justify-center lg:justify-start"
            selectClassName="min-w-0 flex-1 max-lg:absolute max-lg:inset-0 max-lg:opacity-0"
          />
          <div className="flex justify-center lg:justify-start lg:px-1">
            <SignOutButton
              label={t("auth.signOut")}
              className="cursor-pointer rounded-full border border-accent-ink/15 px-3 py-1.5 text-xs font-semibold"
            />
          </div>
        </>
      }
    >
      {children}
    </StudioShell>
  );
}
