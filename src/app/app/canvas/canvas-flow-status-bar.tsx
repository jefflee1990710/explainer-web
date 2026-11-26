"use client";

// Slim live flow status bar directly under the canvas header.
// Same states the header chip used: running, finished, failed, and stopped.

import { useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Square } from "lucide-react";
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

function flowStatusTone(status: CanvasFlowHeaderStatus): string {
  if (status.failedCount > 0 && status.status !== "running") {
    return "border-rose-400/40 bg-rose-500/12 text-rose-200";
  }
  if (status.status === "running") {
    return "border-[#c6f24b]/40 bg-[#c6f24b]/12 text-[#d6f58a]";
  }
  if (status.status === "completed") {
    return "border-emerald-400/35 bg-emerald-500/12 text-emerald-200";
  }
  return "border-white/15 bg-white/6 text-white/70";
}

export function CanvasFlowStatusBar({
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
  const body = (
    <>
      {status.status === "running" ? (
        <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
      ) : status.status === "completed" ? (
        <Check aria-hidden className="h-3 w-3" />
      ) : status.status === "stopped" && status.failedCount === 0 ? (
        <Square aria-hidden className="h-2.5 w-2.5 fill-current" />
      ) : (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {label}
      {canList ? (
        <ChevronDown aria-hidden className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      ) : null}
    </>
  );

  return (
    <div
      ref={rootRef}
      role="status"
      data-flow-status={status.status}
      className={`relative z-20 flex h-7 w-full shrink-0 items-center border-b px-3 text-[11px] font-semibold backdrop-blur-md ${flowStatusTone(status)}`}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {canList ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex cursor-pointer items-center gap-1.5"
        >
          {body}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5">{body}</span>
      )}
      {canList && open ? (
        <div className="absolute left-3 top-[calc(100%+6px)] z-50 w-80 rounded-xl border border-rose-400/30 bg-[#141820] p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <p className="px-1 pb-1.5 text-[10px] font-semibold tracking-wide text-white/45">
            {isZh ? "失敗的節點" : "Failed nodes"}
          </p>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {status.failures.map((failure, index) => (
              <li key={`${failure.name}-${index}`} className="rounded-lg bg-rose-500/8 px-2 py-1.5">
                <p className="text-[12px] font-semibold text-rose-100">{failure.name}</p>
                {failure.error ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-rose-100/70">{failure.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
