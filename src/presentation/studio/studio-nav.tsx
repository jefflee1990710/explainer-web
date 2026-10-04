"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { StudioNavItem, StudioNavSection } from "@/presentation/studio/studio-shell";

const SECTIONS: StudioNavSection[] = ["generation", "setup", "other"];

// Grouped rail: Generation, Setup, then account-style links.
export function StudioNav({ items }: { items: StudioNavItem[] }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const labels: Record<StudioNavSection, string> = {
    generation: t("production.shell.navGeneration"),
    setup: t("production.shell.navSetup"),
    other: t("production.shell.navOther"),
  };

  return (
    <nav
      aria-label={t("production.shell.mainNavAria")}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
    >
      {SECTIONS.map((section, index) => {
        const group = items.filter((item) => item.section === section);
        if (group.length === 0) return null;
        const labelId = `studio-nav-${section}`;
        return (
          <div key={section} role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
            {index > 0 ? (
              <span aria-hidden className="mx-2 mb-1 h-px bg-[var(--studio-line)] lg:hidden" />
            ) : null}
            <p
              id={labelId}
              className="sr-only px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-muted)] lg:not-sr-only"
            >
              {labels[section]}
            </p>
            {group.map((item) => (
              <StudioNavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === "/app" || pathname.startsWith("/app/projects");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StudioNavLink({ item, active }: { item: StudioNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-1.5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] max-lg:justify-center ${
        active
          ? "bg-[var(--studio-cyan-soft)] font-semibold text-[var(--studio-ink)]"
          : "font-medium text-[var(--studio-ink)] hover:bg-[var(--studio-fill)]"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${
          active ? "bg-[var(--studio-teal)] text-[var(--studio-ink)]" : "text-[var(--studio-ink)]"
        }`}
      >
        <RailIcon name={item.icon} />
      </span>
      <span className="hidden truncate lg:inline">{item.label}</span>
      <NavPending />
    </Link>
  );
}

function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-auto hidden h-1.5 w-1.5 rounded-full bg-[var(--studio-teal)] lg:inline-block ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

function RailIcon({ name }: { name: StudioNavItem["icon"] }) {
  const common = "h-5 w-5 shrink-0";
  if (name === "projects") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 7.5h7l2 2H21V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V7.5Z" />
        <path d="M3 7.5V6A1.5 1.5 0 0 1 4.5 4.5H10l2 2" />
      </svg>
    );
  }
  if (name === "directors") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 10h16v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V10Z" />
        <path d="m4 10-.6-2.9a1.5 1.5 0 0 1 1.2-1.8l12.7-2.4a1.5 1.5 0 0 1 1.8 1.2l.5 2.4L4 10Z" />
        <path d="m8.5 5.6 2 3.4M13.5 4.7l2 3.4" />
      </svg>
    );
  }
  if (name === "styles") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.75" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.75" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.75" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.75" />
      </svg>
    );
  }
  if (name === "characters") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
      </svg>
    );
  }
  if (name === "mcp") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M8 8h8v8H8z" />
        <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" />
      </svg>
    );
  }
  if (name === "affiliate") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3.5 14.2 8l5 .7-3.6 3.5.9 5L12 14.8 7.5 17.2l.9-5L4.8 8.7 9.8 8 12 3.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
    </svg>
  );
}
