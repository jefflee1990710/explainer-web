"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand-mark";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { StudioBackdrop } from "@/components/studio-backdrop";

// Folder and character workspaces are split panes; they get a wider canvas
// than the single-column dashboard, library, and billing pages.
const WIDE_ROUTE = /^\/app\/(projects|characters)\/[^/]+$/;

export function AppShell({
  credits,
  children,
}: {
  credits: number;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const wide = WIDE_ROUTE.test(pathname);

  return (
    <div className="studio-canvas relative flex flex-1 flex-col">
      <StudioBackdrop />
      <div className="relative z-10 flex flex-1 flex-col">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between border-b border-accent-ink/10 bg-paper/70 px-6 py-4 backdrop-blur-md"
        >
          <div className="flex items-center gap-6">
            <BrandMark href="/app" />
            <nav className="flex gap-4 text-sm font-medium text-muted">
              <NavLink href="/app">{t("nav.projects")}</NavLink>
              <NavLink href="/app/characters">{t("nav.characters")}</NavLink>
              <NavLink href="/app/billing">{t("nav.billing")}</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <LanguageSwitcher />
            <span className="rounded-full border border-accent-ink/10 bg-lime/70 px-3 py-1 font-semibold text-accent-ink">
              {credits} {t("common.credits")}
            </span>
            <UserButton />
          </div>
        </motion.header>
        <main
          className={`mx-auto w-full px-6 py-10 ${wide ? "max-w-7xl" : "max-w-5xl"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
