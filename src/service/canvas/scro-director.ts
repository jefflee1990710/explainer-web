// Swap and Teleport directors: settings live on one card. Build expands trim → render → grade
// and leaves the card in place so the next Build replaces those rows.

import type { CanvasAspectRatio, CanvasNodeData } from "@/model/canvas";
import type { ScroGroup } from "@/service/canvas/scro-groups/builder";
import { buildSwapGroup } from "@/service/canvas/scro-groups/swap";
import { buildTeleportGroup } from "@/service/canvas/scro-groups/teleport";
import { clampSectionLength } from "@/service/canvas/settings/section";

export const SWAP_DIRECTOR_MODEL_ID = "scro:swap";
export const TELEPORT_DIRECTOR_MODEL_ID = "scro:teleport";

const SWAP_MODES = ["character", "object", "relight", "colorfix"] as const;
const OBJECT_EDITS = ["change", "add", "remove"] as const;

export type SwapDirectorMode = (typeof SWAP_MODES)[number];
export type ScroDirectorBuildError = "video" | "reference" | "object" | "scene";

type DirectorLike = { type: string; data: CanvasNodeData };

export type ScroDirectorBuild = {
  directorId: string;
  videoNodeId?: string;
  // Swap reference image, or the Teleport scene photo.
  referenceNodeId?: string;
  idPrefix: string;
  origin: { x: number; y: number };
};

export type ScroDirectorBuilt = {
  group: ScroGroup;
  memberIds: string[];
  expandedNodeIds: string[];
  builtGroupId: string;
};

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberOr(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function isSwapDirectorNode(node: DirectorLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === SWAP_DIRECTOR_MODEL_ID &&
    node.data.toolParams?.directorMode === true
  );
}

export function isTeleportDirectorNode(node: DirectorLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === TELEPORT_DIRECTOR_MODEL_ID &&
    node.data.toolParams?.directorMode === true
  );
}

export function isScroDirectorNode(node: DirectorLike): boolean {
  return isSwapDirectorNode(node) || isTeleportDirectorNode(node);
}

export function readExpandedNodeIds(data: CanvasNodeData): string[] {
  const raw = data.toolParams?.expandedNodeIds;
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
}

export function scroDirectorBuildMessage(error: ScroDirectorBuildError, isZh: boolean): string {
  const copy: Record<ScroDirectorBuildError, [string, string]> = {
    video: ["先連接來源影片。", "Connect a source video first."],
    reference: ["角色替換需要一張參考圖。", "Character swap needs a reference image."],
    object: ["請寫下要換成什麼。", "Write what the object should become."],
    scene: ["連接場景圖，或寫下場景。", "Connect a scene image, or describe the scene."],
  };
  return isZh ? copy[error][0] : copy[error][1];
}

function sectionOf(data: CanvasNodeData) {
  const params = data.toolParams ?? {};
  return {
    sectionStart: Math.max(0, numberOr(params.sectionStart, 0)),
    sectionLength: clampSectionLength(numberOr(params.sectionLength, 6)),
    aspectRatio: (data.aspectRatio ?? "9:16") as CanvasAspectRatio,
  };
}

function builtFrom(input: ScroDirectorBuild, group: ScroGroup): ScroDirectorBuilt {
  const expandedNodeIds = group.nodes.map((node) => node.id);
  return {
    group,
    expandedNodeIds,
    builtGroupId: input.idPrefix,
    memberIds: [input.directorId, ...expandedNodeIds],
  };
}

export function buildSwapDirectorGroup(
  node: DirectorLike,
  input: ScroDirectorBuild,
): ScroDirectorBuilt | { error: ScroDirectorBuildError } {
  if (!input.videoNodeId) return { error: "video" };
  const params = node.data.toolParams ?? {};
  const mode: SwapDirectorMode = SWAP_MODES.includes(params.swapMode as SwapDirectorMode)
    ? (params.swapMode as SwapDirectorMode)
    : "character";
  const instruction = node.data.prompt?.trim() ?? "";
  if (mode === "character" && !input.referenceNodeId) return { error: "reference" };
  if (mode === "object" && !instruction) return { error: "object" };
  const section = sectionOf(node.data);
  const edit = OBJECT_EDITS.includes(params.objectEditMode as (typeof OBJECT_EDITS)[number])
    ? (params.objectEditMode as (typeof OBJECT_EDITS)[number])
    : undefined;
  const group = buildSwapGroup(
    { idPrefix: input.idPrefix, origin: input.origin },
    {
      video: { nodeId: input.videoNodeId },
      mode,
      ...(input.referenceNodeId ? { reference: { nodeId: input.referenceNodeId } } : {}),
      ...(instruction ? { instruction } : {}),
      ...(text(params.objectTarget) ? { objectTarget: text(params.objectTarget) } : {}),
      ...(edit ? { objectEditMode: edit } : {}),
      ...(text(params.lightLookId) ? { lightLookId: text(params.lightLookId) } : {}),
      ...section,
    },
  );
  return builtFrom(input, group);
}

export function buildTeleportDirectorGroup(
  node: DirectorLike,
  input: ScroDirectorBuild,
): ScroDirectorBuilt | { error: ScroDirectorBuildError } {
  if (!input.videoNodeId) return { error: "video" };
  const sceneText = text(node.data.toolParams?.sceneText);
  const scene = input.referenceNodeId
    ? { kind: "image" as const, ref: { nodeId: input.referenceNodeId } }
    : sceneText
      ? { kind: "text" as const, text: sceneText }
      : undefined;
  if (!scene) return { error: "scene" };
  const mood = node.data.prompt?.trim();
  const group = buildTeleportGroup(
    { idPrefix: input.idPrefix, origin: input.origin },
    {
      video: { nodeId: input.videoNodeId },
      scene,
      ...(mood ? { mood } : {}),
      ...sectionOf(node.data),
    },
  );
  return builtFrom(input, group);
}
