"use client";

// Actions a group frame can trigger; provided by the canvas workspace.

import { createContext, useContext } from "react";
import type { CanvasGroupColor } from "@/model/canvas";

export type CanvasGroupActionsContextValue = {
  isZh: boolean;
  isFlowRunning: boolean;
  onRename: (groupId: string, title: string) => void;
  onColor: (groupId: string, color: CanvasGroupColor) => void;
  onToggleCollapse: (groupId: string) => void;
  onRun: (groupId: string) => void;
  onUngroup: (groupId: string) => void;
  onDelete: (groupId: string) => void;
};

export const CanvasGroupActionsContext = createContext<CanvasGroupActionsContextValue | null>(null);

export function useCanvasGroupActions(): CanvasGroupActionsContextValue {
  const ctx = useContext(CanvasGroupActionsContext);
  if (!ctx) throw new Error("useCanvasGroupActions must be used inside CanvasGroupActionsContext");
  return ctx;
}
