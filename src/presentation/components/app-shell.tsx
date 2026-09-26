"use client";

import { UserButton } from "@clerk/nextjs";
import { LanguageSwitcher } from "@/presentation/components/language-switcher";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioShell, type StudioNavItem } from "@/presentation/studio/studio-shell";

// Logged-in chrome. Page content sits in the studio shell.
export function AppShell({
  credits,
  children,
}: {
  credits: number;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const items: StudioNavItem[] = [
    { href: "/app", label: t("nav.projects"), icon: "projects" },
    { href: "/app/characters", label: t("nav.characters"), icon: "characters" },
    { href: "/app/mcp", label: t("nav.mcp"), icon: "mcp" },
    { href: "/app/affiliate", label: t("nav.affiliate"), icon: "affiliate" },
    { href: "/app/billing", label: t("nav.billing"), icon: "billing" },
  ];

  return (
    <StudioShell
      items={items}
      credits={credits}
      creditsLabel={t("common.credits")}
      toolbar={
        <>
          <LanguageSwitcher />
          <UserButton />
        </>
      }
    >
      {children}
    </StudioShell>
  );
}
