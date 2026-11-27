// Live flow status for the canvas header. Counts come from node cards, so a
// retry or a later failure updates the centered text without another Run Flow.

import { findCanvasModel, type CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";

export type CanvasFlowFailure = {
  name: string;
  error?: string;
};

export type CanvasFlowHeaderStatus = {
  status: "running" | "completed" | "failed" | "stopped";
  /** flow = Run Flow waves; nodes = individual cards still working or failed. */
  scope: "flow" | "nodes";
  current: number;
  total: number;
  failedCount: number;
  failures: CanvasFlowFailure[];
};

export type FlowHeaderNode = {
  id: string;
  type: string;
  data: {
    status?: string;
    modelId?: string;
    label?: string;
    fileName?: string;
    lastError?: string;
  };
};

const FLOW_ROLE_NAME: Record<string, { zh: string; en: string }> = {
  frame: { zh: "分鏡畫面", en: "Frame" },
  video: { zh: "影片", en: "Video" },
  voice: { zh: "配音", en: "Voice" },
  mux: { zh: "音畫合成", en: "Audio mix" },
  concat: { zh: "合併串接", en: "Concat" },
};

function flowRoleLabel(id: string, locale: string): { name: string; index: string } | null {
  const match = id.match(/-(frame|video|voice|mux|concat)-(\d+)$/);
  const role = match ? FLOW_ROLE_NAME[match[1]!] : undefined;
  if (!match || !role) return null;
  const zh = locale.toLowerCase().startsWith("zh");
  return { name: zh ? role.zh : role.en, index: match[2]! };
}

export function describeFlowFailures(
  nodes: readonly FlowHeaderNode[],
  ids: readonly string[] | undefined,
  models: readonly CanvasModelSpec[],
  locale: string,
): CanvasFlowFailure[] {
  const zh = locale.toLowerCase().startsWith("zh");
  return (ids ?? []).map((id) => {
    const node = nodes.find((item) => item.id === id);
    const role = flowRoleLabel(id, locale);
    const spec = node?.data.modelId ? findCanvasModel(node.data.modelId, models) : undefined;
    const base = spec
      ? canvasModelDisplayName(spec, locale)
      : node?.data.label?.trim() || node?.data.fileName?.trim() || role?.name || id;
    const name = role && !base.endsWith(` ${role.index}`) ? `${base} ${role.index}` : base;
    const error = node?.data.lastError?.trim();
    if (error) return { name, error };
    if (!node) {
      return {
        name,
        error: zh
          ? "這張卡片已經不在畫布上，失敗原因沒有留下。這一輪沒有建立工作。"
          : "This card is no longer on the canvas, so the error was not kept. This run never started a job.",
      };
    }
    return { name };
  });
}

function isBusyStatus(status: string | undefined): boolean {
  return status === "queued" || status === "running";
}

// Builds the header status from the cards the user can see right now.
// While Run Flow is in progress, failures are only the ones this run has recorded.
// After it settles, a card that is retried or fails on its own updates the count.
export function deriveCanvasFlowHeaderStatus(input: {
  nodes: readonly FlowHeaderNode[];
  models: readonly CanvasModelSpec[];
  locale: string;
  isFlowRunning: boolean;
  wave: { current: number; total: number } | null;
  settled: "finished" | "stopped" | null;
  runFailureIds?: readonly string[];
}): CanvasFlowHeaderStatus | null {
  const modelNodes = input.nodes.filter((node) => node.type === "model");
  const busyCount = modelNodes.filter((node) => isBusyStatus(node.data.status)).length;
  const liveFailedIds = modelNodes
    .filter((node) => node.data.status === "failed")
    .map((node) => node.id);
  const failedIds = input.isFlowRunning ? [...(input.runFailureIds ?? [])] : liveFailedIds;
  const failures = describeFlowFailures(input.nodes, failedIds, input.models, input.locale);
  const current = input.wave?.current ?? 0;
  const total = input.wave?.total ?? 0;

  if (input.isFlowRunning) {
    return {
      status: "running",
      scope: "flow",
      current,
      total,
      failedCount: failures.length,
      failures,
    };
  }

  if (busyCount > 0) {
    return {
      status: "running",
      scope: "nodes",
      current: busyCount,
      total: busyCount,
      failedCount: failures.length,
      failures,
    };
  }

  if (failures.length > 0) {
    if (input.settled === "stopped") {
      return {
        status: "stopped",
        scope: "flow",
        current,
        total,
        failedCount: failures.length,
        failures,
      };
    }
    return {
      status: "failed",
      scope: input.settled === "finished" ? "flow" : "nodes",
      current,
      total,
      failedCount: failures.length,
      failures,
    };
  }

  if (input.settled === "stopped") {
    return {
      status: "stopped",
      scope: "flow",
      current,
      total,
      failedCount: 0,
      failures: [],
    };
  }

  if (input.settled === "finished") {
    return {
      status: "completed",
      scope: "flow",
      current,
      total,
      failedCount: 0,
      failures: [],
    };
  }

  return null;
}
