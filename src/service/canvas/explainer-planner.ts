// Pure helpers for the Canvas Explainer planner node (scro:explainer with plannerMode).

import type { CanvasNode } from "@/model/canvas";

export const EXPLAINER_PLANNER_MODEL_ID = "scro:explainer";

// "planned": an Explainer Director holding its plan; "expanded": an old card already replaced by its rows.
export type ExplainerPlanStatus = "planning" | "planned" | "expanded" | "failed";

const PLAN_STATUSES: readonly ExplainerPlanStatus[] = ["planning", "planned", "expanded", "failed"];

export const TALKING_HEAD_PLANNER_MODEL_ID = "scro:talking-head";

// Director tools that plan for free on a planning card before expanding into nodes.
export const PLANNER_MODEL_IDS: readonly string[] = [
  EXPLAINER_PLANNER_MODEL_ID,
  TALKING_HEAD_PLANNER_MODEL_ID,
];

export function isDirectorPlannerNode(node: Pick<CanvasNode, "type" | "data">): boolean {
  return (
    node.type === "model" &&
    PLANNER_MODEL_IDS.includes(node.data.modelId ?? "") &&
    node.data.toolParams?.plannerMode === true
  );
}

export const isExplainerPlannerNode = isDirectorPlannerNode;

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

// Older canvases kept the Explainer node after expanding; its nodes already exist, so drop it on load.
export function dropExpandedPlanners<E extends { source: string; target: string }>(graph: {
  nodes: readonly CanvasNode[];
  edges: readonly E[];
}): { nodes: CanvasNode[]; edges: E[] } {
  const stale = new Set(
    graph.nodes
      .filter((n) => isExplainerPlannerNode(n) && readPlannerParams(n).planStatus === "expanded")
      .map((n) => n.id),
  );
  return {
    nodes: graph.nodes.filter((n) => !stale.has(n.id)),
    edges: graph.edges.filter((e) => !stale.has(e.source) && !stale.has(e.target)),
  };
}
