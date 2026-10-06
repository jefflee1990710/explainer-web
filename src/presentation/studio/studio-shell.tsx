"use client";

import { BrandMark } from "@/presentation/components/brand-mark";
import { StudioNav } from "@/presentation/studio/studio-nav";

export type StudioNavSection = "generation" | "setup" | "other";

export type StudioNavItem = {
  href: string;
  label: string;
  section: StudioNavSection;
  icon: "projects" | "posts" | "directors" | "styles" | "characters" | "products" | "mcp" | "affiliate" | "billing" | "settings";
};

// Logged-in frame: full-height icon rail and a scrolling main slot.
export function StudioShell({
  items,
  headerEnd,
  toolbar,
  children,
}: {
  items: StudioNavItem[];
  // Sticky queue banner. Hidden when the slot renders nothing.
  headerEnd: React.ReactNode;
  // Account controls pinned to the bottom of the rail.
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="studio-app flex h-dvh w-full flex-col">
      <div className="flex min-h-0 flex-1">
        <StudioRail items={items}>{toolbar}</StudioRail>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--studio-canvas)]">
          {headerEnd}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">{children}</div>
        </main>
      </div>
      {/* Dialogs portal here so the scrim covers the rail, not only the editor. */}
      <div id="studio-dialog-root" className="contents" />
    </div>
  );
}

// Icon rail. Hover or keyboard focus expands labels over 200ms.
function StudioRail({ items, children }: { items: StudioNavItem[]; children: React.ReactNode }) {
  return (
    <aside className="group/rail relative z-50 flex h-full w-[72px] shrink-0 flex-col overflow-hidden border-r border-[var(--studio-line)] bg-[var(--studio-panel)] p-2 transition-[width] duration-200 ease-out hover:w-[200px] focus-within:w-[200px]">
      <div className="mb-2 flex shrink-0 justify-center border-b border-[var(--studio-line)] px-1 pb-3 pt-1 group-hover/rail:justify-start group-focus-within/rail:justify-start">
        <BrandMark
          href="/app"
          wordClassName="hidden text-xl font-bold tracking-tight group-hover/rail:inline group-focus-within/rail:inline"
        />
      </div>
      <StudioNav items={items} />
      <div className="mt-auto flex flex-col items-center gap-2 border-t border-[var(--studio-line)] pt-3 text-sm group-hover/rail:items-stretch group-focus-within/rail:items-stretch">
        {children}
      </div>
    </aside>
  );
}
