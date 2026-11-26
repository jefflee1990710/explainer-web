// Pure: model nodes left "queued" / "running" with no job behind them never finish on their own.

import type { CanvasNode } from "@/model/canvas";

export const ORPHAN_BUSY_ERROR = "上次執行沒有開始，請重新執行";
export const UPSTREAM_FAILED_ERROR = "上游節點失敗，這個節點沒有執行";

// Marks busy model nodes without a lastJobId as failed, unless a flow run is still going.
export function failOrphanBusyNodes(nodes: readonly CanvasNode[], flowRunning: boolean): CanvasNode[] {
  if (flowRunning) return [...nodes];
  return nodes.map((node) => {
    const busy = node.data.status === "queued" || node.data.status === "running";
    if (node.type !== "model" || !busy || node.data.lastJobId) return node;
    return { ...node, data: { ...node.data, status: "failed", lastError: ORPHAN_BUSY_ERROR } };
  });
}
