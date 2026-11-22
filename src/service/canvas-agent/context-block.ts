// Turns a right-clicked canvas node or group into the [Context] block sent with the next chat message.

import type { CanvasGroup, CanvasNode } from "@/model/canvas";

export type CanvasAgentContextRef = { kind: "node" | "group"; id: string };

export type ContextMenuChoice = { kind: "node" } | { kind: "group"; groupId: string };

const CONTEXT_LIMIT = 8;
const SNIPPET_CHARS = 80;
export const CANVAS_AGENT_MESSAGE_MAX = 2000;

// A node always offers itself. A node inside a group also offers that group.
// The group frame offers only the group.
export function contextMenuChoices(input: { groupId: string | null; frame?: boolean }): ContextMenuChoice[] {
  if (input.frame) return input.groupId ? [{ kind: "group", groupId: input.groupId }] : [];
  const choices: ContextMenuChoice[] = [{ kind: "node" }];
  if (input.groupId) choices.push({ kind: "group", groupId: input.groupId });
  return choices;
}

// One chip per node or group. The oldest chip drops off after the cap.
export function addContextRef(
  list: readonly CanvasAgentContextRef[],
  ref: CanvasAgentContextRef,
): CanvasAgentContextRef[] {
  if (list.some((item) => item.kind === ref.kind && item.id === ref.id)) return [...list];
  return [...list, ref].slice(-CONTEXT_LIMIT);
}

export function removeContextRef(
  list: readonly CanvasAgentContextRef[],
  ref: CanvasAgentContextRef,
): CanvasAgentContextRef[] {
  return list.filter((item) => item.kind !== ref.kind || item.id !== ref.id);
}

function snippet(value: string | undefined): string {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return "";
  return text.length > SNIPPET_CHARS ? `${text.slice(0, SNIPPET_CHARS)}…` : text;
}

function nodeName(node: CanvasNode): string {
  return node.data.label || node.data.modelId || node.data.fileName || node.type;
}

// Chip text stays short: "openrouter:.../seedream-5-0-lite" becomes "seedream-5-0-lite".
function shortName(name: string): string {
  const tail = name.split("/").pop() ?? name;
  return tail.includes(":") ? (tail.split(":").pop() ?? tail) : tail;
}

// Short lines the model can follow. Nodes or groups that were deleted are left out.
export function formatCanvasAgentContext(
  refs: readonly CanvasAgentContextRef[],
  nodes: readonly CanvasNode[],
  groups: readonly CanvasGroup[],
): string {
  const lines: string[] = [];
  for (const ref of refs) {
    if (ref.kind === "node") {
      const node = nodes.find((item) => item.id === ref.id);
      if (!node) continue;
      const group = groups.find((item) => item.memberIds.includes(node.id));
      const words = snippet(node.data.prompt || node.data.text);
      const groupBit = group ? ` · group ${group.id} "${group.title}"` : "";
      lines.push(`- node ${node.id} · ${nodeName(node)}${groupBit}${words ? ` · ${words}` : ""}`);
      continue;
    }
    const group = groups.find((item) => item.id === ref.id);
    if (!group) continue;
    lines.push(`- group ${group.id} "${group.title}" · ${group.kind} · ${group.memberIds.length} nodes`);
  }
  if (lines.length === 0) return "";
  return `[Context]\nThe user pointed at these. Act on these ids.\n${lines.join("\n")}`;
}

export function contextChipLabel(
  ref: CanvasAgentContextRef,
  nodes: readonly CanvasNode[],
  groups: readonly CanvasGroup[],
): string {
  if (ref.kind === "group") return groups.find((group) => group.id === ref.id)?.title ?? ref.id;
  const node = nodes.find((item) => item.id === ref.id);
  return node ? shortName(nodeName(node)) : ref.id;
}

// Context goes first. The user's own words are kept when the two together pass the chat limit.
export function composeCanvasAgentMessage(
  userText: string,
  block: string,
  max = CANVAS_AGENT_MESSAGE_MAX,
): string {
  const text = userText.trim();
  const context = block.trim();
  if (!context) return text.slice(0, max);
  const joiner = "\n\n";
  const combined = `${context}${joiner}${text}`;
  if (combined.length <= max) return combined;
  const room = max - joiner.length - text.length;
  if (room < 1) return text.slice(0, max);
  return `${context.slice(0, room)}${joiner}${text}`.slice(0, max);
}
