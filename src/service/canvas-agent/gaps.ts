// Post-turn check for the Scro canvas agent: finds model nodes added this turn that
// cannot run yet (empty required port) or that skipped the reference image every
// other node in the same batch uses, and wires the cases that have only one answer.

import type { CanvasNode } from "@/model/canvas";
import { getNodeOutputPortType, validateEdgeConnection } from "@/service/canvas/core/graph";
import { type CanvasPortType, findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { CANVAS_AGENT_TOOL_HANDLERS } from "@/service/canvas-agent/tools";
import { type CanvasAgentWorkingGraph } from "@/service/canvas-agent/working-graph";

export type CanvasAgentGap = {
  nodeId: string;
  modelName: string;
  port: string;
  portType: CanvasPortType;
  // "required": the node cannot run. "batch_reference": siblings share a reference this node lacks.
  reason: "required" | "batch_reference";
  // Node ids that could feed this port, best first.
  candidates: string[];
};

// Model nodes created by this turn that are still on the canvas, in creation order.
function addedModelNodes(g: CanvasAgentWorkingGraph): CanvasNode[] {
  const ids = new Set(
    g.ops.flatMap((op) => (op.kind === "add_node" && op.node.type === "model" ? [op.node.id] : [])),
  );
  return g.nodes.filter((n) => ids.has(n.id));
}

function incoming(g: CanvasAgentWorkingGraph, nodeId: string, port: string): string[] {
  return g.edges.filter((e) => e.target === nodeId && e.targetHandle === port).map((e) => e.source);
}

// Every node whose output can legally connect to this port (types match, no cycle).
function portCandidates(g: CanvasAgentWorkingGraph, nodeId: string, port: string): string[] {
  const target = g.nodes.find((n) => n.id === nodeId);
  const spec = target?.data.modelId ? findCanvasModel(target.data.modelId, g.catalog) : undefined;
  const portType = spec?.inputs.find((p) => p.id === port)?.type;
  if (!portType) return [];
  return g.nodes
    .filter((n) => n.id !== nodeId && getNodeOutputPortType(n, g.catalog) === portType)
    .filter(
      (n) =>
        validateEdgeConnection(
          g.nodes,
          g.edges,
          { source: n.id, sourceHandle: "output", target: nodeId, targetHandle: port },
          g.catalog,
          { allowReplaceSingle: true },
        ).valid,
    )
    .map((n) => n.id);
}

export function findCanvasAgentGaps(g: CanvasAgentWorkingGraph): CanvasAgentGap[] {
  const added = addedModelNodes(g);
  const gaps: CanvasAgentGap[] = [];

  for (const node of added) {
    const spec = node.data.modelId ? findCanvasModel(node.data.modelId, g.catalog) : undefined;
    if (!spec) continue;

    for (const port of spec.inputs) {
      if (!port.required) continue;
      if (incoming(g, node.id, port.id).length > 0) continue;
      // An inline prompt counts as a filled prompt port.
      if (port.id === "prompt" && node.data.prompt?.trim()) continue;
      gaps.push({
        nodeId: node.id,
        modelName: spec.name,
        port: port.id,
        portType: port.type,
        reason: "required",
        candidates: portCandidates(g, node.id, port.id),
      });
    }

    // Same model added in one batch: if the wired siblings all share reference images,
    // a sibling with no references was almost certainly forgotten.
    const refPort = spec.inputs.find((p) => p.id === "refImages");
    if (!refPort || incoming(g, node.id, "refImages").length > 0) continue;
    const siblingRefs = added
      .filter((s) => s.id !== node.id && s.data.modelId === node.data.modelId)
      .map((s) => incoming(g, s.id, "refImages"))
      .filter((refs) => refs.length > 0);
    if (siblingRefs.length === 0) continue;
    const shared = siblingRefs[0]!
      .filter((id) => siblingRefs.every((refs) => refs.includes(id)))
      .slice(0, refPort.maxConnections);
    if (shared.length === 0) continue;
    gaps.push({
      nodeId: node.id,
      modelName: spec.name,
      port: "refImages",
      portType: "image",
      reason: "batch_reference",
      candidates: shared,
    });
  }
  return gaps;
}

// Wires gaps that have exactly one sensible answer. Returns how many edges were added.
export function autofixCanvasAgentGaps(g: CanvasAgentWorkingGraph, gaps: readonly CanvasAgentGap[]): number {
  let fixed = 0;
  for (const gap of gaps) {
    const sources =
      gap.reason === "batch_reference" ? gap.candidates : gap.candidates.length === 1 ? gap.candidates : [];
    for (const sourceId of sources) {
      const linked = CANVAS_AGENT_TOOL_HANDLERS.connect(g, {
        sourceId,
        targetId: gap.nodeId,
        targetPort: gap.port,
      });
      if (linked.ok) fixed += 1;
    }
  }
  return fixed;
}

// One line per gap for the repair and summary prompts.
export function describeCanvasAgentGaps(g: CanvasAgentWorkingGraph, gaps: readonly CanvasAgentGap[]): string {
  const name = (id: string) => {
    const node = g.nodes.find((n) => n.id === id);
    if (!node) return id;
    const label = node.data.fileName ?? node.data.label ?? node.data.modelId ?? node.type;
    return `${id} (${label})`;
  };
  return gaps
    .map((gap) => {
      const what =
        gap.reason === "required"
          ? `has nothing on required port "${gap.port}" (${gap.portType})`
          : `has no "refImages" while the other ${gap.modelName} nodes in this batch use ${gap.candidates.map(name).join(", ")}`;
      const options =
        gap.reason === "required"
          ? gap.candidates.length > 0
            ? ` Possible sources: ${gap.candidates.map(name).join(", ")}.`
            : " No node on the canvas can feed it."
          : "";
      return `- ${gap.modelName} ${gap.nodeId} ${what}.${options}`;
    })
    .join("\n");
}
