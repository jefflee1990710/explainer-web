// Canvas character nodes used as image references: the wardrobe lock added to image prompts,
// and the guard that stops a run while the character's wired outfit is not generated yet.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { characterOutfitPort } from "@/service/canvas/core/character-node";

export type CharacterOutfitPending = {
  nodeId: string;
  name: string;
  state: "not_generated" | "generating";
};

// Outfit pieces are wired in, but the new look is missing or still being made.
// Running now would silently use the character's default outfit.
export function characterOutfitPending(
  node: CanvasNode,
  edges: readonly Pick<CanvasEdge, "target" | "targetHandle">[],
): CharacterOutfitPending | undefined {
  if (node.type !== "character") return undefined;
  const hasOutfit = edges.some(
    (edge) => edge.target === node.id && Boolean(characterOutfitPort(edge.targetHandle)),
  );
  if (!hasOutfit) return undefined;
  const name = node.data.label || node.data.fileName || "角色";
  if (node.data.status === "queued" || node.data.status === "running") {
    return { nodeId: node.id, name, state: "generating" };
  }
  if (!node.data.outputUrl?.trim()) return { nodeId: node.id, name, state: "not_generated" };
  return undefined;
}

// Every character wired into `targetId` whose outfit is not ready, in wire order.
export function pendingCharacterOutfitSources(
  targetId: string,
  nodes: readonly CanvasNode[],
  edges: readonly Pick<CanvasEdge, "source" | "target" | "targetHandle">[],
): CharacterOutfitPending[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const out: CharacterOutfitPending[] = [];
  for (const edge of edges) {
    if (edge.target !== targetId) continue;
    const source = byId.get(edge.source);
    if (!source || out.some((item) => item.nodeId === source.id)) continue;
    const pending = characterOutfitPending(source, edges);
    if (pending) out.push(pending);
  }
  return out;
}

export function characterOutfitPendingMessage(
  pending: readonly CharacterOutfitPending[],
  isZh = true,
): string {
  return pending
    .map((item) =>
      item.state === "generating"
        ? isZh
          ? `角色「${item.name}」的新造型仍在生成中，請等它完成再執行，否則會用預設穿搭出圖。`
          : `${item.name}'s new outfit is still generating. Wait for it to finish, or this run uses the default outfit.`
        : isZh
          ? `角色「${item.name}」已接上穿搭，但新造型尚未生成。請先在角色節點按「生成新造型」，否則會用預設穿搭出圖。`
          : `${item.name} has outfit pieces wired but no new outfit yet. Press New outfit on the character first, or this run uses the default outfit.`,
    )
    .join(isZh ? "" : " ");
}

// An outfit piece wired straight into the model means the user wants those clothes, so no lock.
export function isOutfitReferenceNode(node: CanvasNode): boolean {
  const params = node.data.toolParams ?? {};
  return node.type === "media" && (typeof params.outfitPart === "string" || typeof params.outfitPrompt === "string");
}

function joinPositions(positions: readonly number[]): string {
  if (positions.length <= 1) return String(positions[0] ?? "");
  return `${positions.slice(0, -1).join(", ")} and ${positions.at(-1)}`;
}

// `positions` are 1-based places of character images in the model's reference list.
export function canvasWardrobeLockLine(positions: readonly number[]): string {
  const many = positions.length > 1;
  const refs = `${many ? "Reference images" : "Reference image"} ${joinPositions(positions)}`;
  return [
    `WARDROBE LOCK: ${refs} ${many ? "are the characters; each one is" : "is the character; it is"} the only source of truth for that character's outfit (garments, colours, pattern, shoes, bag, accessories) and hair.`,
    "Keep exactly that outfit whatever the prompt, weather, location, or activity says, and ignore any clothing wording in the text.",
    "Never add, swap, or remove coats, jackets, hats, scarves, gloves, backpacks, or any worn gear.",
  ].join(" ");
}

export function withCanvasWardrobeLock(prompt: string, positions?: readonly number[]): string {
  if (!positions || positions.length === 0) return prompt;
  const line = canvasWardrobeLockLine(positions);
  const base = prompt.trim();
  return base ? `${base}\n\n${line}` : line;
}
