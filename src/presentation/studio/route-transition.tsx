"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { cleanRoutePathname, resolvePendingAppHref } from "@/presentation/studio/route-transition-href";

type RouteTransitionContextValue = {
  // Pathname of an in-flight intra-app navigation, or null when settled.
  pendingHref: string | null;
  activePathname: string;
  startRouteTransition: (href: string) => void;
};

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  pendingHref: null,
  activePathname: "/app",
  startRouteTransition: () => {},
});

// Tracks clicks on internal /app links so the shell switches to a loading view immediately.
export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = cleanRoutePathname(usePathname() || "/app");
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear pending state as soon as the router commits the new pathname.
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Safety net: if a navigation is aborted or blocked, release after 12s.
  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const nextPath = resolvePendingAppHref({
        rawHref: anchor.getAttribute("href"),
        resolvedHref: anchor.href,
        currentOrigin: window.location.origin,
        currentPathname: pathname,
      });
      if (nextPath) setPendingHref(nextPath);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  function startRouteTransition(href: string) {
    const nextPath = cleanRoutePathname(href);
    if (nextPath.startsWith("/app") && nextPath !== pathname) {
      setPendingHref(nextPath);
    }
  }

  const activePathname = pendingHref ?? pathname;

  return (
    <RouteTransitionContext.Provider value={{ pendingHref, activePathname, startRouteTransition }}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}
