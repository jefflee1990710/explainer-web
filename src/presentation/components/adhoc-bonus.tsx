"use client";

import { createContext, useContext, type ReactNode } from "react";

const AdhocBonusContext = createContext(0);

// Server layout passes the env percent so pack pickers match what checkout grants.
export function AdhocBonusProvider({
  percent,
  children,
}: {
  percent: number;
  children: ReactNode;
}) {
  return <AdhocBonusContext.Provider value={percent}>{children}</AdhocBonusContext.Provider>;
}

export function useAdhocBonusPercent() {
  return useContext(AdhocBonusContext);
}
