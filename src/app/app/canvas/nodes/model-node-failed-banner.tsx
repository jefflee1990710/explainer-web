"use client";

// The provider reason stored on the node. The failed state itself is unchanged.

import { AlertCircle } from "lucide-react";

export function ModelNodeFailedBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-1.5 rounded-[10px] border border-rose-500/35 bg-rose-500/10 p-2 text-[11px] text-rose-200">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
      <span className="line-clamp-3">{message}</span>
    </div>
  );
}
