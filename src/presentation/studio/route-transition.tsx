"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cleanRoutePathname, resolvePendingAppHref } from "@/presentation/studio/route-transition-href";

type RouteTransitionContextValue = {
  // Pathname of an in-flight intra-app navigation, or null when settled.
  pendingHref: string | null;
  activePathname: string;
  startRouteTransition: (href: string) => void;
  syncClientPathname: (href: string) => void;
  registerInstantRouteHandler: (handler: ((nextPath: string) => boolean) | null) => void;
};

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  pendingHref: null,
  activePathname: "/app",
  startRouteTransition: () => {},
  syncClientPathname: () => {},
  registerInstantRouteHandler: () => {},
});

// Tracks clicks on internal /app links so the shell switches to a loading view immediately.
export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = cleanRoutePathname(usePathname() || "/app");
  const [pendingState, setPendingState] = useState<{ from: string; target: string } | null>(null);
  const [clientState, setClientState] = useState<{ from: string; target: string } | null>(null);
  const instantHandlerRef = useRef<((nextPath: string) => boolean) | null>(null);

  const pendingHref = pendingState && pendingState.from === pathname ? pendingState.target : null;
  const clientPathname = clientState && clientState.from === pathname ? clientState.target : null;

  // Safety net: if a navigation is aborted or blocked, release after 12s.
  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingState(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const syncClientPathname = useCallback(
    (href: string) => {
      const nextPath = cleanRoutePathname(href);
      if (!nextPath.startsWith("/app")) return;
      setPendingState(null);
      setClientState({ from: pathname, target: nextPath });
      if (
        typeof window !== "undefined" &&
        cleanRoutePathname(window.location.pathname) !== nextPath
      ) {
        window.history.replaceState(window.history.state, "", nextPath);
      }
    },
    [pathname],
  );

  const registerInstantRouteHandler = useCallback(
    (handler: ((nextPath: string) => boolean) | null) => {
      instantHandlerRef.current = handler;
    },
    [],
  );

  const currentEffectivePathname = clientPathname ?? pathname;

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
        currentPathname: currentEffectivePathname,
      });
      if (!nextPath) return;
      if (instantHandlerRef.current?.(nextPath)) {
        event.preventDefault();
        event.stopPropagation();
        syncClientPathname(nextPath);
        return;
      }
      setPendingState({ from: pathname, target: nextPath });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [currentEffectivePathname, pathname, syncClientPathname]);

  function startRouteTransition(href: string) {
    const nextPath = cleanRoutePathname(href);
    if (nextPath.startsWith("/app") && nextPath !== currentEffectivePathname) {
      setPendingState({ from: pathname, target: nextPath });
    }
  }

  const activePathname = pendingHref ?? clientPathname ?? pathname;

  return (
    <RouteTransitionContext.Provider
      value={{
        pendingHref,
        activePathname,
        startRouteTransition,
        syncClientPathname,
        registerInstantRouteHandler,
      }}
    >
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}
