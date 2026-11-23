"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/presentation/components/brand-mark";
import { useI18n } from "@/presentation/components/i18n-provider";
import { isFullBleedStudioPath } from "@/presentation/components/app/director-dock/director-dock-config";
import { EditorLoadingOverlay } from "@/presentation/components/app/projects/new/editor-loading-overlay";
import { RouteTransitionProvider, useRouteTransition } from "@/presentation/studio/route-transition";
import { StudioChromeProvider, useStudioChrome } from "@/presentation/studio/studio-chrome";
import { StudioNav } from "@/presentation/studio/studio-nav";
import { StudioRailHint } from "@/presentation/studio/studio-rail-hint";
import {
  hasSeenStudioNavTutorial,
  StudioNavFeatureDiscovery,
} from "@/presentation/studio/studio-nav-feature-discovery";
import { StudioRouteSkeleton } from "@/presentation/studio/studio-route-skeleton";
import { StudioThemeProvider, useStudioTheme } from "@/presentation/studio/studio-theme";

export type StudioNavSection =
  | "home"
  | "create"
  | "remix"
  | "social"
  | "character"
  | "assets"
  | "account";

export type StudioNavItem = {
  href: string;
  label: string;
  section: StudioNavSection;
  icon:
    | "home"
    | "canvas"
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
    <StudioChromeProvider>
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
    </StudioChromeProvider>
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
  const { locale } = useI18n();
  const { activePathname } = useRouteTransition();
  const { railExpanded, toggleRail } = useStudioChrome();
  const isVideoEditorRoute = /^\/app\/projects\/[^/]+\/videos\/[^/]+$/.test(activePathname);
  const [navTourOpen, setNavTourOpen] = useState(false);
  const showNavTour = navTourOpen && !isVideoEditorRoute;
  const expanded = showNavTour || railExpanded;
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const modeLabel = expanded
    ? isZh
      ? "只顯示圖示"
      : "Icons only"
    : isZh
      ? "完整選單"
      : "Full menu";

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
      data-expanded={expanded ? "true" : "false"}
      className={`group/rail relative z-50 flex h-full shrink-0 flex-col border-r border-[var(--studio-line)] bg-[var(--studio-sidebar,var(--studio-panel))] py-3 transition-[width] duration-200 ease-out ${
        expanded ? "w-[256px] px-2.5" : "w-[72px] px-2.5"
      }`}
    >
      <div
        className={`mb-3 flex shrink-0 pb-2 pt-0.5 ${
          expanded
            ? "flex-row items-center justify-between px-1"
            : "flex-col items-center justify-center gap-1.5"
        }`}
      >
        {expanded ? (
          <BrandMark
            href="/app"
            wordClassName="inline text-xl font-bold tracking-tight text-[var(--studio-ink)]"
          />
        ) : (
          <StudioRailHint label="Scro">
            <BrandMark href="/app" wordClassName="hidden" />
          </StudioRailHint>
        )}
        <StudioRailHint label={expanded ? "" : modeLabel}>
          <button
            type="button"
            onClick={toggleRail}
            aria-label={modeLabel}
            title={modeLabel}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--studio-muted)] transition hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)]"
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
        </StudioRailHint>
      </div>
      <StudioNav items={items} forceExpanded={expanded} />
      <div
        className={`mt-auto flex flex-col gap-2 border-t border-[var(--studio-line)] pt-3 text-sm ${
          expanded ? "items-stretch" : "items-center"
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
