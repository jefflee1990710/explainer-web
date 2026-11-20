// Shared types for the Scro canvas agent (chat dock below /app/canvas).

import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";

export const CANVAS_AGENT_LANGUAGES = ["zh-Hant", "yue", "en", "zh-Hans", "ja", "ko"] as const;
export type CanvasAgentLanguage = (typeof CANVAS_AGENT_LANGUAGES)[number];

export const CANVAS_AGENT_LANGUAGE_LABELS: Record<CanvasAgentLanguage, string> = {
  "zh-Hant": "繁體中文",
  yue: "廣東話",
  en: "English",
  "zh-Hans": "简体中文",
  ja: "日本語",
  ko: "한국어",
};

export function isCanvasAgentLanguage(value: unknown): value is CanvasAgentLanguage {
  return typeof value === "string" && (CANVAS_AGENT_LANGUAGES as readonly string[]).includes(value);
}

// One graph edit made by the agent. The client replays these in order.
export type CanvasAgentOp =
  | { kind: "add_node"; node: CanvasNode }
  | { kind: "update_node"; nodeId: string; patch: Partial<CanvasNodeData> }
  | { kind: "remove_node"; nodeId: string }
  | { kind: "add_edge"; edge: CanvasEdge }
  | { kind: "remove_edge"; edgeId: string }
  | { kind: "move_node"; nodeId: string; position: { x: number; y: number } };

export type CanvasAgentGraph = { nodes: CanvasNode[]; edges: CanvasEdge[] };
