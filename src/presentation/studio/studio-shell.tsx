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
import { StudioThemeProvider, useStudioTheme } from "@/presentation/studio/studio-theme";

export type StudioNavSection = "home" | "create" | "character" | "assets" | "account";

export type StudioNavItem = {
  href: string;
  label: string;
  section: StudioNavSection;
  icon:
    | "home"
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
  tag?: string;
  imageUrl?: string;
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "scro:studio-sidebar-collapsed";

// Logged-in frame: full-height OpenArt-inspired left sidebar and a scrolling main slot.
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
    <StudioThemeProvider>
      <RouteTransitionProvider>
        <StudioShellInner
          items={items}
          headerEnd={headerEnd}
          toolbar={toolbar}
          banner={banner}
        >
          {children}
        </StudioShellInner>
      </RouteTransitionProvider>
    </StudioThemeProvider>
  );
}

function StudioShellInner({
  items,
  headerEnd,
  toolbar,
  banner,
  children,
}: {
  items: StudioNavItem[];
  headerEnd: React.ReactNode;
  toolbar: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { theme } = useStudioTheme();

  return (
    <div
      data-studio-theme={theme}
      className="studio-app flex h-dvh w-full flex-col"
    >
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

// Left sidebar inspired by OpenArt reference: expanded by default (256px) with a collapse toggle button in the top-right.
function StudioRail({ items, children }: { items: StudioNavItem[]; children: React.ReactNode }) {
  const { activePathname } = useRouteTransition();
  const isVideoEditorRoute = /^\/app\/projects\/[^/]+\/videos\/[^/]+$/.test(activePathname);
  const [navTourOpen, setNavTourOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const showNavTour = navTourOpen && !isVideoEditorRoute;
  const expanded = showNavTour || !collapsed;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (saved === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

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

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  return (
    <aside
      data-expanded={expanded ? "true" : "false"}
      className={`group/rail relative z-50 flex h-full shrink-0 flex-col border-r border-[var(--studio-line)] bg-[var(--studio-sidebar,var(--studio-panel))] p-3 transition-[width] duration-200 ease-out ${
        expanded ? "w-[252px]" : "w-[72px] hover:w-[252px] focus-within:w-[252px]"
      }`}
    >
      <div
        className={`mb-3 flex shrink-0 items-center justify-between px-1 pb-2 pt-0.5 ${
          expanded ? "" : "justify-center group-hover/rail:justify-between group-focus-within/rail:justify-between"
        }`}
      >
        <BrandMark
          href="/app"
          wordClassName={`text-xl font-bold tracking-tight text-[var(--studio-ink)] ${
            expanded ? "inline" : "hidden group-hover/rail:inline group-focus-within/rail:inline"
          }`}
        />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--studio-muted)] transition hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)] ${
            expanded ? "inline-flex" : "hidden group-hover/rail:inline-flex group-focus-within/rail:inline-flex"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="16" rx="2.5" />
            <path d="M9 4v16" />
          </svg>
        </button>
      </div>
      <StudioNav items={items} forceExpanded={expanded} />
      <div
        className={`mt-auto flex flex-col gap-2 border-t border-[var(--studio-line)] pt-3 text-sm ${
          expanded
            ? "items-stretch"
            : "items-center group-hover/rail:items-stretch group-focus-within/rail:items-stretch"
        }`}
      >
        {children}
      </div>
      <StudioNavFeatureDiscovery
        open={showNavTour}
        onClose={() => setNavTourOpen(false)}
      />
    </aside>
  );
}
