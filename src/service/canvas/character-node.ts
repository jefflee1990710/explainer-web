// Character nodes on the canvas: one person, with an image input for each outfit slot.

import type { CanvasNode, CanvasNodeData, CanvasNodeType } from "@/model/canvas";
import type { CanvasLibraryAsset } from "@/service/canvas/projects";

export const CHARACTER_OUTFIT_PORTS = [
  { id: "hair", multiple: false, maxConnections: 1, zh: "髮型", en: "Hair" },
  { id: "top", multiple: false, maxConnections: 1, zh: "上衣", en: "Top" },
  { id: "pants", multiple: false, maxConnections: 1, zh: "褲子", en: "Pants" },
  { id: "shoes", multiple: false, maxConnections: 1, zh: "鞋子", en: "Shoes" },
  { id: "accessory", multiple: false, maxConnections: 1, zh: "配件", en: "Accessory" },
  { id: "looks", multiple: true, maxConnections: 6, zh: "整套", en: "Full look" },
] as const;

export type CharacterOutfitPortId = (typeof CHARACTER_OUTFIT_PORTS)[number]["id"];

const PART_LABEL: Record<Exclude<CharacterOutfitPortId, "looks">, string> = {
  hair: "Hair",
  top: "Top",
  pants: "Pants",
  shoes: "Shoes",
  accessory: "Accessory",
};

const WARDROBE_LINE = /^(?:Hair|Top|Pants|Shoes|Accessory):/;

export type OutfitWire = {
  handle: string;
  name?: string;
  prompt?: string;
};

export type CharacterNodeHit = {
  id: string;
  type?: string | null;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
};

const CHARACTER_NODE_WIDTH = 280;
const CHARACTER_NODE_HEIGHT = 460;

export function characterOutfitPort(id: string) {
  return CHARACTER_OUTFIT_PORTS.find((port) => port.id === id);
}

// Wardrobe pieces land on their part. A full saved look uses the multi looks input.
export function outfitHandleForPart(part?: string): CharacterOutfitPortId {
  if (part === "hair" || part === "top" || part === "pants" || part === "shoes" || part === "accessory") {
    return part;
  }
  return "looks";
}

// Dragging a character creates a character node. An outfit stays an image the user can wire in.
export function libraryAssetNodeDraft(asset: CanvasLibraryAsset): {
  type: CanvasNodeType;
  data: CanvasNodeData;
} {
  if (asset.source === "character") {
    return {
      type: "character",
      data: {
        label: asset.name,
        fileName: asset.name,
        characterId: asset.id,
        mediaKind: "image",
        mediaUrl: asset.url,
        status: "idle",
      },
    };
  }
  if (asset.source === "outfit") {
    return {
      type: "media",
      data: {
        label: asset.name,
        fileName: asset.name,
        mediaKind: "image",
        mediaUrl: asset.url,
        toolParams: {
          ...(asset.outfitPart ? { outfitPart: asset.outfitPart } : {}),
          ...(asset.outfitPrompt ? { outfitPrompt: asset.outfitPrompt } : {}),
        },
      },
    };
  }
  return {
    type: "media",
    data: {
      label: asset.name,
      fileName: asset.name,
      mediaKind: asset.mediaKind,
      mediaUrl: asset.url,
    },
  };
}

// The topmost character card under a drop point, so an outfit can connect immediately.
export function findCharacterNodeAt(
  nodes: readonly CharacterNodeHit[],
  point: { x: number; y: number },
): string | undefined {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (node?.type !== "character") continue;
    const width = node.measured?.width ?? CHARACTER_NODE_WIDTH;
    const height = node.measured?.height ?? CHARACTER_NODE_HEIGHT;
    const inside =
      point.x >= node.position.x &&
      point.x <= node.position.x + width &&
      point.y >= node.position.y &&
      point.y <= node.position.y + height;
    if (inside) return node.id;
  }
  return undefined;
}

export function outfitWiresFromGraph(
  nodeId: string,
  nodes: readonly CanvasNode[],
  edges: readonly { source: string; target: string; targetHandle: string }[],
): OutfitWire[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const wires: OutfitWire[] = [];
  for (const edge of edges) {
    if (edge.target !== nodeId) continue;
    const source = byId.get(edge.source);
    if (!source) continue;
    const params = source.data.toolParams ?? {};
    const prompt = typeof params.outfitPrompt === "string" ? params.outfitPrompt : undefined;
    wires.push({
      handle: edge.targetHandle,
      name: source.data.label || source.data.fileName,
      prompt,
    });
  }
  return wires;
}

// Wardrobe edit text the character pipeline already understands (Hair / Top / …).
export function characterOutfitEditInstruction(wires: readonly OutfitWire[]): string {
  const lines: string[] = [];
  const looks: string[] = [];
  for (const wire of wires) {
    const text = (wire.prompt || wire.name || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const label = PART_LABEL[wire.handle as keyof typeof PART_LABEL];
    if (label) {
      lines.push(`${label}: ${text}`);
      continue;
    }
    if (WARDROBE_LINE.test(text) || /;\s*(?:Hair|Top|Pants|Shoes|Accessory):/.test(text)) {
      lines.push(text);
      continue;
    }
    looks.push(text);
  }
  if (looks.length > 0) lines.push(`Outfit: ${looks.join(". ")}`);
  return lines.join("; ").slice(0, 1200);
}

// Unchecked keeps this canvas look off the character. Checked replaces the default outfit.
export function canvasOutfitVersionFlags(updateDefaultOutfit: boolean): { canvasOneOff?: true } {
  return updateDefaultOutfit ? {} : { canvasOneOff: true };
}

export function canvasOutfitPresetName(wires: readonly OutfitWire[]): string {
  const bits = wires
    .map((wire) => (wire.name || wire.prompt || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return (bits.join(" + ") || "新造型").slice(0, 60);
}
