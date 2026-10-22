"use client";

import { BrandMark } from "@/presentation/components/brand-mark";
import { EditorLoadingOverlay } from "@/presentation/components/app/projects/new/editor-loading-overlay";
import { RouteTransitionProvider, useRouteTransition } from "@/presentation/studio/route-transition";
import { StudioNav } from "@/presentation/studio/studio-nav";
import { StudioRouteSkeleton } from "@/presentation/studio/studio-route-skeleton";

export type StudioNavSection = "generation" | "setup" | "other";

export type StudioNavItem = {
  href: string;
  label: string;
  section: StudioNavSection;
  icon: "projects" | "posts" | "directors" | "styles" | "characters" | "life" | "room" | "text" | "products" | "mcp" | "affiliate" | "billing" | "settings";
};

// Logged-in frame: full-height icon rail and a scrolling main slot.
export function StudioShell({
  items,
  headerEnd,
  toolbar,
  banner,
  children,
}: {
  items: StudioNavItem[];
  // Sticky queue banner. Hidden when the slot renders nothing.
  headerEnd: React.ReactNode;
  // Account controls pinned to the bottom of the rail.
  toolbar: React.ReactNode;
  // Offer strip across the top of the signed-in app.
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <RouteTransitionProvider>
      <div className="studio-app flex h-dvh w-full flex-col">
        {banner}
        <div className="flex min-h-0 flex-1">
          <StudioRail items={items}>{toolbar}</StudioRail>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--studio-canvas)]">
            {headerEnd}
            <StudioMainSlot>{children}</StudioMainSlot>
          </main>
        </div>
        {/* Dialogs portal here so the scrim covers the rail, not only the editor.
            Not display:contents: that drops the overlay out of hit testing, so a click
            on a dialog button also hits the control underneath. Zero size so the empty
            host never sits on top of the page. */}
        <div id="studio-dialog-root" className="pointer-events-none fixed top-0 left-0 z-[100] h-0 w-0" />
      </div>
    </RouteTransitionProvider>
  );
}

// Swaps to the skeleton immediately when an /app link is clicked so the user is never stuck on the old page.
function StudioMainSlot({ children }: { children: React.ReactNode }) {
  const { pendingHref } = useRouteTransition();
  const isVideoEditorRoute = Boolean(pendingHref && /^\/app\/projects\/[^/]+\/videos\/[^/]+$/.test(pendingHref));
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
      {pendingHref ? (
        isVideoEditorRoute ? (
          <EditorLoadingOverlay />
        ) : (
          <StudioRouteSkeleton />
        )
      ) : (
        children
      )}
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
