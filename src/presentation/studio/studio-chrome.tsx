"use client";

// Lets a page hide the studio rail. On /app/canvas the rail stays closed
// until the canvas menu button opens it, and it comes back on other pages.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type StudioChromeValue = {
  railHidden: boolean;
  toggleRail: () => void;
  hideRail: () => void;
};

const StudioChromeContext = createContext<StudioChromeValue | null>(null);

export function StudioChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const onCanvas = pathname.startsWith("/app/canvas");
  // The pin is tied to the current path, so leaving the canvas closes it again.
  const [pin, setPin] = useState({ path: "", open: false });
  const pinnedOpen = pin.path === pathname && pin.open;

  const hideRail = useCallback(() => setPin({ path: pathname, open: false }), [pathname]);
  const toggleRail = useCallback(() => {
    setPin((current) => {
      const open = current.path === pathname && current.open;
      return { path: pathname, open: !open };
    });
  }, [pathname]);
  const railHidden = onCanvas && !pinnedOpen;

  const value = useMemo(
    () => ({ railHidden, toggleRail, hideRail }),
    [railHidden, toggleRail, hideRail],
  );

  return <StudioChromeContext.Provider value={value}>{children}</StudioChromeContext.Provider>;
}

export function useStudioChrome(): StudioChromeValue {
  return (
    useContext(StudioChromeContext) ?? {
      railHidden: false,
      toggleRail: () => {},
      hideRail: () => {},
    }
  );
}
