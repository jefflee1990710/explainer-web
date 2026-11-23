"use client";

// The app menu stays on screen. Full width and icons are the only two modes.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { STUDIO_RAIL_COLLAPSED_KEY, studioRailCollapsed } from "@/presentation/studio/studio-rail-mode";

type StudioChromeValue = {
  railExpanded: boolean;
  toggleRail: () => void;
};

const StudioChromeContext = createContext<StudioChromeValue | null>(null);

function readCollapsed(onCanvas: boolean): boolean {
  try {
    return studioRailCollapsed(window.localStorage.getItem(STUDIO_RAIL_COLLAPSED_KEY), onCanvas);
  } catch {
    return onCanvas;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(STUDIO_RAIL_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage errors.
  }
}

export function StudioChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const onCanvas = pathname.startsWith("/app/canvas");
  const [collapsed, setCollapsed] = useState(onCanvas);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    setCollapsed(readCollapsed(onCanvas));
  }, [onCanvas]);

  const toggleRail = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      writeCollapsed(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ railExpanded: !collapsed, toggleRail }),
    [collapsed, toggleRail],
  );

  return <StudioChromeContext.Provider value={value}>{children}</StudioChromeContext.Provider>;
}

export function useStudioChrome(): StudioChromeValue {
  return (
    useContext(StudioChromeContext) ?? {
      railExpanded: true,
      toggleRail: () => {},
    }
  );
}
