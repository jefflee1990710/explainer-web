// Empty canvas character: reference photos and outfit slots in, one Seedream blueprint out.

import type { CanvasNodeData } from "@/model/canvas";
import type { CanvasPortSpec } from "@/model/canvas-model";
import { promptPort, refImagesPort } from "@/service/canvas/catalog/ports";
import {
  CHARACTER_OUTFIT_PORTS,
  characterOutfitEditInstruction,
  characterOutfitPort,
  outfitHandleForPart,
  type OutfitWire,
} from "@/service/canvas/core/character-node";

export const CHARACTER_BLUEPRINT_MODEL_ID = "scro:character";

// OpenRouter Seedream 5.0 Pro. The canvas job records this id, and Run submits the same model.
export const CHARACTER_BLUEPRINT_PROVIDER_MODEL_ID = "bytedance-seed/seedream-5-0-pro";

export const CHARACTER_BLUEPRINT_REF_MAX = 8;

// Seedream accepts 14 references. Photos come first; outfit images fill what is left.
export const CHARACTER_BLUEPRINT_REFERENCE_CAP = 14;

const NODE_WIDTH = 280;
const CHARACTER_NODE_HEIGHT = 460;
const BLUEPRINT_NODE_HEIGHT = 640;

const NAME_MAX = 40;
const PROMPT_MAX = 1200;

export const CHARACTER_OUTFIT_PORT_IDS: ReadonlySet<string> = new Set(
  CHARACTER_OUTFIT_PORTS.map((port) => port.id),
);

// Prompt, many reference photos, then the same outfit slots as a library character node.
export function characterBlueprintInputPorts(): CanvasPortSpec[] {
  return [
    promptPort(false),
    refImagesPort(CHARACTER_BLUEPRINT_REF_MAX, false),
    ...CHARACTER_OUTFIT_PORTS.map((port) => ({
      id: port.id,
      label: port.en,
      labels: { "zh-Hant": port.zh, en: port.en },
      type: "image" as const,
      required: false,
      multiple: port.multiple,
      maxConnections: port.maxConnections,
    })),
  ];
}

export function isCharacterBlueprintNode(node: {
  type?: string | null;
  data?: { modelId?: string };
}): boolean {
  return node.type === "model" && node.data?.modelId === CHARACTER_BLUEPRINT_MODEL_ID;
}

// A sidebar drop. No saved character, no photo, and no blueprint yet.
export function emptyCharacterBlueprintData(): CanvasNodeData {
  return {
    label: "",
    modelId: CHARACTER_BLUEPRINT_MODEL_ID,
    presetId: "1:1",
    aspectRatio: "1:1",
    resolution: "2k",
    prompt: "",
    status: "idle",
  };
}

export type PortraitDropNode = {
  id: string;
  type?: string | null;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
  data?: { modelId?: string };
};

export type PortraitDropTarget = {
  id: string;
  kind: "character" | "blueprint";
};

function containsPoint(
  node: PortraitDropNode,
  point: { x: number; y: number },
  fallbackHeight: number,
): boolean {
  const width = node.measured?.width ?? NODE_WIDTH;
  const height = node.measured?.height ?? fallbackHeight;
  return (
    point.x >= node.position.x &&
    point.x <= node.position.x + width &&
    point.y >= node.position.y &&
    point.y <= node.position.y + height
  );
}

// Topmost library character or empty character blueprint under the pointer.
export function findPortraitDropTarget(
  nodes: readonly PortraitDropNode[],
  point: { x: number; y: number },
): PortraitDropTarget | undefined {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (!node) continue;
    if (node.type === "character" && containsPoint(node, point, CHARACTER_NODE_HEIGHT)) {
      return { id: node.id, kind: "character" };
    }
    if (isCharacterBlueprintNode(node) && containsPoint(node, point, BLUEPRINT_NODE_HEIGHT)) {
      return { id: node.id, kind: "blueprint" };
    }
  }
  return undefined;
}

// Outfit pieces land on their slot. Any other image is another reference photo.
export function blueprintDropHandle(input: {
  mediaKind?: string | null;
  source?: string | null;
  outfitPart?: string | null;
}): string | null {
  if (input.mediaKind && input.mediaKind !== "image") return null;
  if (input.source === "outfit") return outfitHandleForPart(input.outfitPart ?? undefined);
  return "refImages";
}

export function blueprintHandleMax(handle: string): number {
  if (handle === "refImages") return CHARACTER_BLUEPRINT_REF_MAX;
  return characterOutfitPort(handle)?.maxConnections ?? 1;
}

export function blueprintHandleReplaces(handle: string): boolean {
  if (handle === "refImages") return false;
  return characterOutfitPort(handle)?.multiple !== true;
}

export type BlueprintAttachPlan = "add" | "replace" | "full";

// Single outfit slots replace the previous wire. Reference photos and full looks append until full.
export function blueprintAttachPlan(
  edges: readonly { target: string; targetHandle?: string | null }[],
  targetId: string,
  handle: string,
): BlueprintAttachPlan {
  const count = edges.filter((edge) => edge.target === targetId && edge.targetHandle === handle).length;
  if (blueprintHandleReplaces(handle)) return count > 0 ? "replace" : "add";
  return count >= blueprintHandleMax(handle) ? "full" : "add";
}

export function outfitRefMeta(source: { data: CanvasNodeData }): { name?: string; prompt?: string } {
  const params = source.data.toolParams ?? {};
  const prompt = typeof params.outfitPrompt === "string" ? params.outfitPrompt : undefined;
  const name = source.data.label || source.data.fileName;
  return {
    ...(name ? { name } : {}),
    ...(prompt ? { prompt } : {}),
  };
}

export type CharacterBlueprintGap = "empty";

// Run needs a description or at least one photo / outfit. A bare drop stays empty.
export function characterBlueprintGap(input: {
  prompt?: string;
  imageCount: number;
}): CharacterBlueprintGap | null {
  if (input.prompt?.trim() || input.imageCount > 0) return null;
  return "empty";
}

export function characterBlueprintPrompt(input: {
  name?: string;
  description?: string;
  outfitWires: readonly OutfitWire[];
  photoCount: number;
}): string {
  const lines = [
    "Character blueprint, one identity portrait, head and shoulders, facing the camera.",
    "Plain flat light background, evenly lit, no text, no labels, no scene, no border.",
    "Keep this exact person's face: face shape, eyes, nose, mouth, age, and natural marks. Do not beautify or replace them with a generic face.",
  ];
  if (input.photoCount > 0) {
    const noun = input.photoCount === 1 ? "image is a photo" : "images are photos";
    lines.push(`The first ${input.photoCount} reference ${noun} of this person.`);
  }
  const name = input.name?.replace(/\s+/g, " ").trim();
  if (name) lines.push(`Character name: ${name}.`);
  const description = input.description?.replace(/\s+/g, " ").trim();
  if (description) lines.push(`Character: ${description}`);
  const outfit = characterOutfitEditInstruction(input.outfitWires);
  if (outfit) {
    lines.push(
      input.photoCount > 0
        ? `Later reference images are clothing. Dress them in this outfit and ignore the clothes in the photos: ${outfit}`
        : `The reference images are clothing. Dress the person in this outfit: ${outfit}`,
    );
  } else if (input.photoCount > 0) {
    lines.push("Keep the clothing shown in the reference photos.");
  }
  return lines.join(" ");
}

export function characterBlueprintReferenceUrls(input: {
  refImages: readonly string[];
  outfitUrls: readonly string[];
}): string[] {
  const urls: string[] = [];
  for (const url of [...input.refImages, ...input.outfitUrls]) {
    const trimmed = url.trim();
    if (!trimmed || urls.includes(trimmed)) continue;
    urls.push(trimmed);
    if (urls.length >= CHARACTER_BLUEPRINT_REFERENCE_CAP) break;
  }
  return urls;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export type CanvasCharacterSaveInput = {
  name: string;
  blueprintUrl: string;
  prompt: string;
  referenceImageUrls: string[];
};

export function parseCanvasCharacterSave(input: {
  name?: string;
  blueprintUrl?: string;
  prompt?: string;
  referenceImageUrls?: string[];
}): { ok: true; value: CanvasCharacterSaveInput } | { ok: false; error: string } {
  const name = (input.name ?? "").trim().slice(0, NAME_MAX);
  if (!name) return { ok: false, error: "請輸入角色名稱" };
  const blueprintUrl = (input.blueprintUrl ?? "").trim();
  if (!isHttpsUrl(blueprintUrl)) return { ok: false, error: "角色藍圖尚未完成" };
  const prompt = (input.prompt ?? "").trim().slice(0, PROMPT_MAX) || name;
  const referenceImageUrls: string[] = [];
  for (const raw of input.referenceImageUrls ?? []) {
    const url = raw.trim();
    if (!isHttpsUrl(url) || url === blueprintUrl || referenceImageUrls.includes(url)) continue;
    referenceImageUrls.push(url);
    if (referenceImageUrls.length >= CHARACTER_BLUEPRINT_REFERENCE_CAP) break;
  }
  return { ok: true, value: { name, blueprintUrl, prompt, referenceImageUrls } };
}

// One finished sheet. The canvas run already paid Seedream, so this row is not charged again.
export function canvasBlueprintVersionFields(input: CanvasCharacterSaveInput & { now: Date }) {
  return {
    styleId: "realistic" as const,
    prompt: input.prompt,
    ...(input.referenceImageUrls[0] ? { referenceImageUrl: input.referenceImageUrls[0] } : {}),
    ...(input.referenceImageUrls.length > 0 ? { referenceImageUrls: [...input.referenceImageUrls] } : {}),
    blueprintKind: "sheet" as const,
    portraitUrl: input.blueprintUrl,
    blueprintUrl: input.blueprintUrl,
    status: "completed" as const,
    creditsCharged: false as const,
    createdAt: input.now,
  };
}
