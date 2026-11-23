"use client";

import { isFullBleedStudioPath } from "@/presentation/components/app/director-dock/director-dock-config";
import { EditorLoadingOverlay } from "@/presentation/components/app/projects/new/editor-loading-overlay";
import { RouteTransitionProvider, useRouteTransition } from "@/presentation/studio/route-transition";
import { StudioHeader } from "@/presentation/studio/studio-header";
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

// Logged-in frame: top header and a scrolling main slot.
export function StudioShell({
  headerEnd,
  toolbar,
  taskBadge = 0,
  banner,
  children,
}: {
  // Sticky queue banner. Hidden when the slot renders nothing.
  headerEnd: React.ReactNode;
  // Account menu on the right of the header.
  toolbar: React.ReactNode;
  taskBadge?: number;
  // Offer strip across the top of the signed-in app.
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <StudioThemeProvider>
      <RouteTransitionProvider>
        <StudioShellInner headerEnd={headerEnd} toolbar={toolbar} taskBadge={taskBadge} banner={banner}>
          {children}
        </StudioShellInner>
      </RouteTransitionProvider>
    </StudioThemeProvider>
  );
}

function StudioShellInner({
  headerEnd,
  toolbar,
  taskBadge,
  banner,
  children,
}: {
  headerEnd: React.ReactNode;
  toolbar: React.ReactNode;
  taskBadge: number;
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
      <StudioHeader taskBadge={taskBadge} account={toolbar} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--studio-canvas)]">
        {headerEnd}
        <StudioMainSlot>{children}</StudioMainSlot>
      </main>
      {/* Dialogs portal here so the scrim covers the header, not only the editor.
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
