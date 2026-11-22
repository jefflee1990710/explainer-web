// Resolves add_scro_group inputs (assets, canvas nodes) and builds the same groups the setup dialogs do.

import type { CanvasAspectRatio, CanvasMediaKind } from "@/model/canvas";
import { findCanvasModel } from "@/service/canvas/model-catalog";
import type { GroupMediaRef, ScroGroup } from "@/service/canvas/scro-groups/builder";
import { buildLifeGroup } from "@/service/canvas/scro-groups/life";
import { buildPosterGroup } from "@/service/canvas/scro-groups/poster";
import { buildSwapGroup } from "@/service/canvas/scro-groups/swap";
import { buildTeleportGroup } from "@/service/canvas/scro-groups/teleport";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

export const SCRO_GROUP_TOOLS = ["life", "poster", "swap", "teleport", "talking-head"] as const;

// Legacy one-node Scro tools; the assistant builds them as visible groups instead.
export const SCRO_GROUP_MODEL_IDS: readonly string[] = [
  "scro:life",
  "scro:poster",
  "scro:swap",
  "scro:teleport",
  "scro:talking-head",
];

export type ScroGroupToolInput = {
  tool: (typeof SCRO_GROUP_TOOLS)[number];
  characterId?: string;
  productId?: string;
  videoNodeId?: string;
  videoAssetId?: string;
  sceneNodeId?: string;
  sceneAssetId?: string;
  sceneText?: string;
  referenceAssetId?: string;
  prompt?: string;
  mode?: "character" | "object" | "relight" | "colorfix";
  objectTarget?: string;
  objectEditMode?: "change" | "add" | "remove";
  lightLookId?: string;
  sectionStart?: number;
  sectionLength?: number;
  language?: "yue" | "zh" | "en";
  framing?: "collarbone-close" | "waist-up" | "handheld-selfie" | "full-body";
  aspectRatio?: CanvasAspectRatio;
};

type Resolved<T> = T | { error: string };

function assetRef(
  g: CanvasAgentWorkingGraph,
  id: string,
  kind: CanvasMediaKind,
  source?: "character" | "product",
): Resolved<{ ref: GroupMediaRef; name: string }> {
  const asset = g.assets.find(
    (a) => a.id === id && a.mediaKind === kind && (!source || a.source === source),
  );
  if (!asset) {
    return { error: `Unknown ${source ?? kind} asset "${id}". Call list_assets() and use an exact id.` };
  }
  return { ref: { url: asset.url, name: asset.name, mediaKind: kind }, name: asset.name };
}

// A node on the canvas whose output is the wanted media kind.
function nodeRef(g: CanvasAgentWorkingGraph, id: string, kind: CanvasMediaKind): Resolved<GroupMediaRef> {
  const node = g.nodes.find((n) => n.id === id);
  if (!node) return { error: `Node "${id}" does not exist.` };
  const output =
    node.type === "media"
      ? node.data.mediaKind
      : node.data.modelId
        ? findCanvasModel(node.data.modelId, g.catalog)?.output.type
        : undefined;
  if (output !== kind) return { error: `Node "${id}" does not output ${kind}.` };
  return { nodeId: id };
}

function mediaInput(
  g: CanvasAgentWorkingGraph,
  kind: CanvasMediaKind,
  nodeId: string | undefined,
  assetId: string | undefined,
  field: string,
): Resolved<GroupMediaRef> {
  if (nodeId) return nodeRef(g, nodeId, kind);
  if (assetId) {
    const found = assetRef(g, assetId, kind);
    return "error" in found ? found : found.ref;
  }
  return { error: `Missing ${field}.` };
}

export function buildAgentScroGroup(
  g: CanvasAgentWorkingGraph,
  input: ScroGroupToolInput,
  aspectRatio: CanvasAspectRatio,
  text: string,
): Resolved<{ group: ScroGroup }> {
  const ctx = { idPrefix: `grp-${g.nextId()}`, origin: nextGroupOrigin(g) };
  const character = input.characterId
    ? assetRef(g, input.characterId, "image", "character")
    : undefined;
  if (character && "error" in character) return character;
  const product = input.productId ? assetRef(g, input.productId, "image", "product") : undefined;
  if (product && "error" in product) return product;

  switch (input.tool) {
    case "life":
      if (!character) return { error: "life needs characterId from list_assets().characters." };
      return { group: buildLifeGroup(ctx, { character: character.ref, scene: text, aspectRatio }) };

    case "poster":
      if (!text) return { error: "poster needs the design prompt in \"prompt\"." };
      return {
        group: buildPosterGroup(ctx, {
          prompt: text,
          ...(character ? { character } : {}),
          ...(product ? { product } : {}),
          aspectRatio,
        }),
      };

    case "swap": {
      const video = mediaInput(g, "video", input.videoNodeId, input.videoAssetId, "videoNodeId or videoAssetId");
      if ("error" in video) return video;
      const mode = input.mode ?? "character";
      let reference: GroupMediaRef | undefined = character?.ref;
      if (input.referenceAssetId) {
        const found = assetRef(g, input.referenceAssetId, "image");
        if ("error" in found) return found;
        reference = found.ref;
      }
      if (mode === "character" && !reference) {
        return { error: "swap in character mode needs characterId or referenceAssetId." };
      }
      if (mode === "object" && !text) {
        return { error: "swap in object mode needs what to change into in \"prompt\"." };
      }
      return {
        group: buildSwapGroup(ctx, {
          video,
          mode,
          ...(reference ? { reference } : {}),
          ...(text ? { instruction: text } : {}),
          ...(input.objectTarget ? { objectTarget: input.objectTarget } : {}),
          ...(input.objectEditMode ? { objectEditMode: input.objectEditMode } : {}),
          ...(input.lightLookId ? { lightLookId: input.lightLookId } : {}),
          sectionStart: input.sectionStart ?? 0,
          sectionLength: input.sectionLength ?? 6,
          aspectRatio,
        }),
      };
    }

    case "teleport": {
      const video = mediaInput(g, "video", input.videoNodeId, input.videoAssetId, "videoNodeId or videoAssetId");
      if ("error" in video) return video;
      let scene: { kind: "image"; ref: GroupMediaRef } | { kind: "text"; text: string };
      if (input.sceneNodeId || input.sceneAssetId) {
        const ref = mediaInput(g, "image", input.sceneNodeId, input.sceneAssetId, "scene");
        if ("error" in ref) return ref;
        scene = { kind: "image", ref };
      } else if (input.sceneText?.trim()) {
        scene = { kind: "text", text: input.sceneText.trim() };
      } else {
        return { error: "teleport needs sceneNodeId, sceneAssetId, or sceneText." };
      }
      return {
        group: buildTeleportGroup(ctx, {
          video,
          scene,
          ...(text ? { mood: text } : {}),
          sectionStart: input.sectionStart ?? 0,
          sectionLength: input.sectionLength ?? 6,
          aspectRatio,
        }),
      };
    }

    default:
      return { error: `Unknown tool "${input.tool}".` };
  }
}

// Groups start to the right of everything already on the canvas.
function nextGroupOrigin(g: CanvasAgentWorkingGraph): { x: number; y: number } {
  if (g.nodes.length === 0) return { x: 0, y: 0 };
  return {
    x: Math.max(...g.nodes.map((n) => n.position.x)) + 400,
    y: Math.min(...g.nodes.map((n) => n.position.y)),
  };
}
