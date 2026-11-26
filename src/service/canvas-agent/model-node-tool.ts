// add_model_node: one model card, plus its prompt node and reference wires in the same call.
// Explainer lands as a planning card instead.

import type { CanvasAspectRatio } from "@/model/canvas";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { soleCanvasCharacterId } from "@/service/canvas-agent/canvas-characters";
import { SCRO_GROUP_MODEL_IDS } from "@/service/canvas-agent/scro-group-tool";
import {
  addNode,
  agentModels,
  clampDuration,
  validateToolParamsForModel,
  type CanvasAgentLinkHandlers,
  type CanvasAgentToolResult,
  type CanvasAgentWorkingGraph,
} from "@/service/canvas-agent/working-graph";

export type AddModelNodeInput = {
  modelId: string;
  prompt?: string;
  promptText?: string;
  wires?: Array<{ sourceId: string; sourcePort?: string; targetPort: string }>;
  aspectRatio?: CanvasAspectRatio;
  durationSeconds?: number;
  toolParams?: Record<string, unknown>;
};

export function addModelNode(
  g: CanvasAgentWorkingGraph,
  handlers: Pick<CanvasAgentLinkHandlers, "connect">,
  input: AddModelNodeInput,
): CanvasAgentToolResult {
  if (findCanvasModel(input.modelId, g.catalog)?.hiddenInSidebar) {
    return { error: `${input.modelId} is created by Explainer planning; add scro:explainer instead.` };
  }
  if (SCRO_GROUP_MODEL_IDS.includes(input.modelId)) {
    return {
      error: `${input.modelId} is built as a visible node group. Call add_scro_group with tool "${input.modelId.slice("scro:".length)}" instead.`,
    };
  }
  const spec = agentModels(g).find((s) => s.id === input.modelId);
  if (!spec) {
    return { error: `Unknown model "${input.modelId}". Call list_models and use an exact id.` };
  }
  const paramError = validateToolParamsForModel(g, spec.id, input.toolParams);
  if (paramError) return { error: paramError };
  // Explainer lands as a self-contained planning card that the canvas plans right after the turn.
  if (spec.id === "scro:explainer") {
    const topic = (input.prompt ?? input.promptText ?? "").trim();
    if (!topic) return { error: "scro:explainer needs the topic or script in \"prompt\"." };
    const named =
      typeof input.toolParams?.characterId === "string" ? input.toolParams.characterId.trim() : "";
    // With no character named, reuse the one character already on the canvas.
    const reused = named ? undefined : soleCanvasCharacterId(g, g.nodes);
    const created = addNode(g, "model", {
      modelId: spec.id,
      aspectRatio: input.aspectRatio ?? "9:16",
      prompt: topic,
      toolParams: {
        ...(reused ? { characterId: reused } : {}),
        ...(input.toolParams ?? {}),
        plannerMode: true,
      },
      status: "idle",
    });
    if (created.error || typeof created.nodeId !== "string") return created;
    return created;
  }
  const created = addNode(g, "model", {
    modelId: spec.id,
    presetId: spec.defaultPresetId,
    aspectRatio: spec.supportsAspectRatio ? (input.aspectRatio ?? "9:16") : undefined,
    resolution: spec.supportsResolution ? "2k" : undefined,
    durationSeconds: clampDuration(spec, input.durationSeconds),
    prompt: input.prompt ?? "",
    ...(input.toolParams ? { toolParams: input.toolParams } : {}),
    status: "idle",
  });
  if (created.error || typeof created.nodeId !== "string") return created;

  const nodeId = created.nodeId;
  const wireErrors: string[] = [];
  let promptNodeId: string | undefined;
  const promptText = input.promptText?.trim();
  if (promptText) {
    const promptNode = addNode(g, "prompt", { label: "Prompt", text: promptText });
    if (promptNode.error || typeof promptNode.nodeId !== "string") {
      wireErrors.push(String(promptNode.error ?? "Could not add the prompt node"));
    } else {
      promptNodeId = promptNode.nodeId;
      const linked = handlers.connect(g, {
        sourceId: promptNodeId,
        targetId: nodeId,
        targetPort: "prompt",
      });
      if (linked.error) wireErrors.push(String(linked.error));
    }
  }
  for (const wire of input.wires ?? []) {
    const linked = handlers.connect(g, {
      sourceId: wire.sourceId,
      ...(wire.sourcePort ? { sourcePort: wire.sourcePort } : {}),
      targetId: nodeId,
      targetPort: wire.targetPort,
    });
    if (linked.error) wireErrors.push(String(linked.error));
  }

  return {
    ok: true,
    nodeId,
    ...(promptNodeId ? { promptNodeId } : {}),
    ...(wireErrors.length > 0
      ? {
          error: `Node ${nodeId} exists. Wires failed: ${wireErrors.join(" | ")}. Use connect to fix those wires. Do not add this node again.`,
        }
      : {}),
  };
}
