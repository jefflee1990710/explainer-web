"use client";

// Covers a node the Director is still building, so it cannot be edited or wired yet.

import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";

const PlanLockContext = createContext<ReadonlySet<string>>(new Set());

export function PlanLockProvider({
  ids,
  children,
}: {
  ids: ReadonlySet<string>;
  children: ReactNode;
}) {
  return <PlanLockContext.Provider value={ids}>{children}</PlanLockContext.Provider>;
}

function PlanLockOverlay() {
  const { locale } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-[16px] bg-[#0b0e13]/55">
      <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#12161f]/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {isZh ? "規劃中" : "Planning…"}
      </span>
    </div>
  );
}

// Leaves the card alone unless this node is one of the Director's in-progress rows.
export function withPlanLock<P extends { id: string }>(Card: ComponentType<P>): ComponentType<P> {
  function LockedCard(props: P) {
    const locked = useContext(PlanLockContext).has(props.id);
    if (!locked) return <Card {...props} />;
    return (
      <div className="relative">
        <div className="pointer-events-none select-none">
          <Card {...props} />
        </div>
        <PlanLockOverlay />
      </div>
    );
  }
  LockedCard.displayName = `PlanLock(${Card.displayName || Card.name || "Card"})`;
  return LockedCard;
}
