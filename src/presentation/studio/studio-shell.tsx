"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/presentation/components/brand-mark";

export type StudioNavItem = {
  href: string;
  label: string;
  icon: "projects" | "characters" | "mcp" | "affiliate" | "billing";
};

// Logged-in frame: icon rail, top bar, and a scrolling main slot.
export function StudioShell({
  items,
  credits,
  creditsLabel,
  toolbar,
  children,
}: {
  items: StudioNavItem[];
  credits: number;
  creditsLabel: string;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="studio-app flex min-h-dvh w-full">
      <StudioRail items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 py-2">
          <BrandMark href="/app" />
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-sm">
            <span className="whitespace-nowrap rounded-md border border-[var(--studio-line)] bg-[var(--studio-panel)] px-2.5 py-1 text-xs font-semibold tabular-nums max-sm:hidden">
              {credits} {creditsLabel}
            </span>
            {toolbar}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--studio-panel)] px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function StudioRail({ items }: { items: StudioNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="主選單"
      className="flex w-[72px] shrink-0 flex-col gap-1 border-r border-[var(--studio-line)] bg-[var(--studio-panel)] p-2 lg:w-[200px]"
    >
      {items.map((item) => (
        <StudioNavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
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
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium ${
        active
          ? "bg-[color-mix(in_srgb,var(--studio-teal)_16%,white)] text-[var(--studio-teal)]"
          : "text-[var(--studio-muted)] hover:bg-[var(--studio-canvas)]"
      }`}
    >
      <RailIcon name={item.icon} />
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
