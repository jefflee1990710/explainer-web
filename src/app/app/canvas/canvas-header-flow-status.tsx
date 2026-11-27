"use client";

// Live flow status centered in the canvas header. White text, no extra bar.

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CanvasFlowHeaderStatus } from "@/app/app/canvas/flow-header-status";

function flowStatusLabel(status: CanvasFlowHeaderStatus, isZh: boolean): string {
  const failed =
    status.failedCount > 0
      ? isZh
        ? ` · ${status.failedCount} 個失敗`
        : ` · ${status.failedCount} failed`
      : "";
  if (status.status === "running") {
    if (status.scope === "nodes") {
      const running = isZh
        ? `${status.current} 個執行中`
        : status.current === 1
          ? "1 running"
          : `${status.current} running`;
      return `${running}${failed}`;
    }
    const wave = status.total > 0 ? ` ${status.current}/${status.total}` : "";
    return `${isZh ? "流程執行中" : "Flow running"}${wave}${failed}`;
  }
  if (status.status === "completed") {
    const wave = status.total > 0 ? ` ${status.current}/${status.total}` : "";
    return isZh ? `流程已完成${wave}` : `Flow finished${wave}`;
  }
  if (status.status === "failed") {
    if (status.scope === "flow") {
      return isZh
        ? `流程結束 · ${status.failedCount} 個失敗`
        : `Flow finished · ${status.failedCount} failed`;
    }
    return isZh ? `${status.failedCount} 個失敗` : `${status.failedCount} failed`;
  }
  const stopped = isZh ? "流程已停止" : "Flow stopped";
  return `${stopped}${failed}`;
}

export function CanvasHeaderFlowStatus({
  status,
  isZh,
}: {
  status: CanvasFlowHeaderStatus | null;
  isZh: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!status) return null;

  const label = flowStatusLabel(status, isZh);
  const canList = status.failures.length > 0;
  const textClass = "max-w-[14rem] truncate text-center text-xs font-semibold text-white";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div
        ref={rootRef}
        className="pointer-events-auto relative"
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        {canList ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={`inline-flex cursor-pointer items-center gap-1 ${textClass}`}
          >
            <span role="status" className="truncate">{label}</span>
            <ChevronDown aria-hidden className={`h-3 w-3 shrink-0 text-white transition ${open ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <p role="status" className={textClass}>
            {label}
          </p>
        )}
        {canList && open ? (
          <div className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-80 -translate-x-1/2 rounded-xl border border-white/10 bg-[#141820] p-2.5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <p className="px-1 pb-1.5 text-[10px] font-semibold tracking-wide text-white/45">
              {isZh ? "失敗的節點" : "Failed nodes"}
            </p>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {status.failures.map((failure, index) => (
                <li key={`${failure.name}-${index}`} className="rounded-lg bg-white/6 px-2 py-1.5">
                  <p className="text-[12px] font-semibold text-white">{failure.name}</p>
                  {failure.error ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-white/70">{failure.error}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
