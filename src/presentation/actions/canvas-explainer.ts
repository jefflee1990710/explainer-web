"use server";

// Server Actions for the Canvas Explainer planner (free storyboard planning + expansion).

import type { CanvasEdge, CanvasNode, CanvasViewport } from "@/model/canvas";
import { requireAppUser } from "@/service/auth";
import {
  type CanvasExplainerPlanState,
  readCanvasExplainerPlan,
  startCanvasExplainerPlan,
} from "@/service/canvas/explainer-plan";
import { saveCanvasProject } from "@/service/canvas/projects";

export async function startCanvasExplainerPlanAction(input: {
  canvasId: string;
  nodeId: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
}): Promise<{ ok: true; plannerVideoId: string } | { ok: false; error: string }> {
  const user = await requireAppUser();
  // Save the latest graph first so the wired prompt and planner fields are current.
  if (input.nodes || input.edges || input.viewport) {
    const saved = await saveCanvasProject(user.clerkUserId, input.canvasId, {
      ...(input.nodes ? { nodes: input.nodes } : {}),
      ...(input.edges ? { edges: input.edges } : {}),
      ...(input.viewport ? { viewport: input.viewport } : {}),
    });
    if (!saved) return { ok: false, error: "找不到畫布專案" };
  }
  return startCanvasExplainerPlan({
    clerkUserId: user.clerkUserId,
    canvasId: input.canvasId,
    nodeId: input.nodeId,
  });
}

export async function getCanvasExplainerPlanAction(input: {
  canvasId: string;
  nodeId: string;
}): Promise<CanvasExplainerPlanState> {
  const user = await requireAppUser();
  return readCanvasExplainerPlan({
    clerkUserId: user.clerkUserId,
    canvasId: input.canvasId,
    nodeId: input.nodeId,
  });
}
