"use client";

import { BrandMark } from "@/presentation/components/brand-mark";
import { CreditMeter } from "@/presentation/studio/credit-meter";
import { StudioNav } from "@/presentation/studio/studio-nav";

export type StudioNavSection = "generation" | "setup" | "other";

export type StudioNavItem = {
  href: string;
  label: string;
  section: StudioNavSection;
  icon: "projects" | "directors" | "styles" | "characters" | "mcp" | "affiliate" | "billing" | "settings";
};

// Logged-in frame: full-height icon rail and a scrolling main slot.
export function StudioShell({
  items,
  credits,
  creditLimit,
  creditsLabel,
  headerEnd,
  toolbar,
  children,
}: {
  items: StudioNavItem[];
  credits: number;
  creditLimit: number;
  creditsLabel: string;
  // Sticky queue banner. Hidden when the slot renders nothing.
  headerEnd: React.ReactNode;
  // Account controls pinned to the bottom of the rail.
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="studio-app flex h-dvh w-full flex-col">
      {headerEnd}
      <div className="flex min-h-0 flex-1">
        <StudioRail items={items}>
          <CreditMeter
            credits={credits}
            creditLimit={creditLimit}
            creditsLabel={creditsLabel}
            className="w-full"
          />
          {toolbar}
        </StudioRail>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--studio-canvas)] px-6 py-6">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

// Full-height rail: brand + nav, then credits / account at the bottom.
function StudioRail({ items, children }: { items: StudioNavItem[]; children: React.ReactNode }) {
  return (
    <aside className="relative z-20 flex h-full w-[72px] shrink-0 flex-col border-r border-[var(--studio-line)] bg-[var(--studio-panel)] p-2 lg:w-[200px]">
      <div className="mb-2 flex shrink-0 justify-center border-b border-[var(--studio-line)] px-1 pb-3 pt-1 lg:justify-start">
        <BrandMark
          href="/app"
          wordClassName="hidden text-xl font-bold tracking-tight lg:inline"
        />
      </div>
      <StudioNav items={items} />
      <div className="mt-auto flex flex-col items-center gap-2 border-t border-[var(--studio-line)] pt-3 text-sm lg:items-stretch">
        {children}
      </div>
    </aside>
  );
}
