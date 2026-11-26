"use client";

// "Old version" notice for canvas nodes whose preview was made before an upstream change.

import { History } from "lucide-react";
import type { OutdatedReason } from "@/service/canvas/stale-outputs";

// Amber status pill text shown instead of "Done".
export function outdatedBadgeText(isZh: boolean): string {
  return isZh ? "舊版本" : "Outdated";
}

export const OUTDATED_BADGE_CLASS = "border-amber-400/45 bg-amber-500/15 text-amber-300";

export function OutdatedBanner({ reason, isZh }: { reason: OutdatedReason; isZh: boolean }) {
  const text =
    reason === "settings"
      ? isZh
        ? "解說導演設定已更改，預覽仍是舊版本。請在導演節點按「重新規劃」。"
        : "Explainer Director settings changed; this preview is an old version. Press Replan on the Director."
      : isZh
        ? "上游設定或提示詞已更改，預覽是舊版本，需要重新生成。"
        : "An upstream setting or prompt changed; this preview is an old version and needs regenerating.";
  return (
    <div className="flex items-start gap-1.5 rounded-[10px] border border-amber-400/35 bg-amber-500/10 p-2 text-[11px] leading-snug text-amber-100">
      <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
      <span>{text}</span>
    </div>
  );
}

// Corner tag over an old preview.
// Shown on the clip that is still on the card while a new run is in progress.
export function PreviousResultTag({ isZh }: { isZh: boolean }) {
  return (
    <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex items-center rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {isZh ? "先前的結果" : "Previous result"}
    </span>
  );
}

export function OutdatedPreviewTag({ isZh }: { isZh: boolean }) {
  return (
    <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-[#11141b]">
      <History className="h-3 w-3" />
      {outdatedBadgeText(isZh)}
    </span>
  );
}
