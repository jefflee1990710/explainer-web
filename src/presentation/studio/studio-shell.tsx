"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/presentation/components/brand-mark";
import { isFullBleedStudioPath } from "@/presentation/components/app/director-dock/director-dock-config";
import { EditorLoadingOverlay } from "@/presentation/components/app/projects/new/editor-loading-overlay";
import { RouteTransitionProvider, useRouteTransition } from "@/presentation/studio/route-transition";
import { StudioNav } from "@/presentation/studio/studio-nav";
import {
  hasSeenStudioNavTutorial,
  StudioNavFeatureDiscovery,
} from "@/presentation/studio/studio-nav-feature-discovery";
import { StudioRouteSkeleton } from "@/presentation/studio/studio-route-skeleton";

export type StudioNavSection = "create" | "character" | "assets" | "account";

export type StudioNavItem = {
  href: string;
  label: string;
  section: StudioNavSection;
  icon:
    | "projects"
    | "posts"
    | "directors"
    | "styles"
    | "wardrobe"
    | "characters"
    | "life"
    | "room"
    | "text"
    | "products"
    | "videos"
    | "tasks"
    | "mcp"
    | "affiliate"
    | "billing"
    | "settings";
  badge?: number;
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
  const { pendingHref, activePathname } = useRouteTransition();
  const isVideoEditorRoute = Boolean(pendingHref && /^\/app\/projects\/[^/]+\/videos\/[^/]+$/.test(pendingHref));
  // Fitting room and Director Dock studios fill the pane without outer padding.
  const fullBleed = isFullBleedStudioPath(activePathname);
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col ${
        fullBleed ? "overflow-hidden" : "overflow-y-auto px-6 py-6"
      }`}
    >
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
  const { activePathname } = useRouteTransition();
  const isVideoEditorRoute = /^\/app\/projects\/[^/]+\/videos\/[^/]+$/.test(activePathname);
  const [navTourOpen, setNavTourOpen] = useState(false);
  const showNavTour = navTourOpen && !isVideoEditorRoute;

  useEffect(() => {
    const closeNavTour = () => setNavTourOpen(false);
    window.addEventListener("scro:close-nav-tour", closeNavTour);
    return () => window.removeEventListener("scro:close-nav-tour", closeNavTour);
  }, []);

  useEffect(() => {
    if (isVideoEditorRoute) return;
    if (!hasSeenStudioNavTutorial()) {
      const timer = window.setTimeout(() => {
        if (
          document.querySelector('[data-opencut-tour="top-right-bar"]') ||
          document.querySelector('[role="dialog"]')
        ) {
          return;
        }
        setNavTourOpen(true);
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [isVideoEditorRoute]);

  return (
    <aside
      className={`group/rail relative z-50 flex h-full shrink-0 flex-col border-r border-[var(--studio-line)] bg-[var(--studio-panel)] p-2 transition-[width] duration-200 ease-out hover:w-[200px] focus-within:w-[200px] ${
        showNavTour ? "w-[200px]" : "w-[72px]"
      }`}
    >
      <div
        className={`mb-2 flex shrink-0 border-b border-[var(--studio-line)] px-1 pb-3 pt-1 group-hover/rail:justify-start group-focus-within/rail:justify-start ${
          showNavTour ? "justify-start" : "justify-center"
        }`}
      >
        <BrandMark
          href="/app"
          wordClassName={`text-xl font-bold tracking-tight group-hover/rail:inline group-focus-within/rail:inline ${
            showNavTour ? "inline" : "hidden"
          }`}
        />
      </div>
      <StudioNav items={items} forceExpanded={showNavTour} />
      <div className="mt-auto flex flex-col items-center gap-2 border-t border-[var(--studio-line)] pt-3 text-sm group-hover/rail:items-stretch group-focus-within/rail:items-stretch">
        {children}
      </div>
      <StudioNavFeatureDiscovery
        open={showNavTour}
        onClose={() => setNavTourOpen(false)}
      />
    </aside>
  );
}
