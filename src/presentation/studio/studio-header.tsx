"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/presentation/components/brand-mark";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useRouteTransition } from "@/presentation/studio/route-transition";
import { isStudioNavActive } from "@/presentation/studio/studio-nav-active";

// Top bar that replaced the left drawer: brand on the left, Output, Tasks, and account on the right.
export function StudioHeader({
  taskBadge = 0,
  account,
}: {
  taskBadge?: number;
  account: ReactNode;
}) {
  const { t } = useI18n();
  const { activePathname } = useRouteTransition();

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-4">
      <BrandMark
        href="/app"
        wordClassName="inline text-xl font-bold tracking-tight text-[var(--studio-ink)]"
      />
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <HeaderLink href="/app/output" label="Output" active={isStudioNavActive(activePathname, "/app/output")} />
        <HeaderLink
          href="/app/tasks"
          label={t("nav.tasks")}
          active={isStudioNavActive(activePathname, "/app/tasks")}
          badge={taskBadge}
        />
        {account}
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  label,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[var(--studio-fill)] text-[var(--studio-ink)]"
          : "text-[var(--studio-muted)] hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)]"
      }`}
    >
      <span>{label}</span>
      {badge > 0 ? (
        <span className="grid min-w-5 place-items-center rounded-full bg-[#c6f24b] px-1.5 text-[10px] font-bold text-[#12141c]">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
