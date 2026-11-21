// Pure helpers for the Canvas Explainer planner node (scro:explainer with plannerMode).

import type { CanvasNode } from "@/model/canvas";

export const EXPLAINER_PLANNER_MODEL_ID = "scro:explainer";

export type ExplainerPlanStatus = "planning" | "expanded" | "failed";

const PLAN_STATUSES: readonly ExplainerPlanStatus[] = ["planning", "expanded", "failed"];

export function isExplainerPlannerNode(node: Pick<CanvasNode, "type" | "data">): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === EXPLAINER_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

// Reads planner state from toolParams, ignoring malformed values.
export function readPlannerParams(node: Pick<CanvasNode, "data">) {
  const params = node.data.toolParams ?? {};
  const status = params.planStatus;
  return {
    plannerVideoId: str(params.plannerVideoId),
    planStatus: PLAN_STATUSES.find((s) => s === status),
    expandedNodeIds: Array.isArray(params.expandedNodeIds)
      ? params.expandedNodeIds.filter((id): id is string => typeof id === "string")
      : [],
    planError: str(params.planError),
    planSummary: str(params.planSummary),
  };
}
