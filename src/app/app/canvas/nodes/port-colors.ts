"use client";

// Shared port colors, runtime status styles, and React Context for Canvas node cards.

import { createContext, useContext } from "react";
import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";
import type {
  CanvasModelCategory,
  CanvasModelSpec,
  CanvasPortType,
} from "@/service/canvas/catalog/model-catalog";
import type { CanvasLibraryCharacterOption } from "@/model/canvas-dto";
import type { OutdatedReason } from "@/service/canvas/core/stale-outputs";

export const PORT_COLOR_MAP: Record<CanvasPortType, string> = {
  image: "#38bdf8",
  video: "#a78bfa",
  audio: "#f59e0b",
  text: "#c6f24b",
};

export const CATEGORY_LABELS: Record<
  CanvasModelCategory,
  { "zh-Hant": string; en: string }
> = {
  image: { "zh-Hant": "生圖", en: "Image" },
  video: { "zh-Hant": "影片", en: "Video" },
  audio: { "zh-Hant": "音訊", en: "Audio" },
  text: { "zh-Hant": "文字", en: "Text" },
  "scro-tool": { "zh-Hant": "Scro 工具", en: "Scro Tool" },
  ffmpeg: { "zh-Hant": "FFmpeg", en: "FFmpeg" },
  editing: { "zh-Hant": "修圖", en: "Edit" },
  segmentation: { "zh-Hant": "去背/分割", en: "Cutout" },
  upscale: { "zh-Hant": "放大", en: "Upscale" },
};

export type CanvasLightboxItem = {
  url: string;
  kind: "image" | "video" | "audio";
  title?: string;
};

export type CanvasNodeActionsContextValue = {
  catalog: readonly CanvasModelSpec[];
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  characterOptions: readonly CanvasLibraryCharacterOption[];
  locale: string;
  projectTitle: string;
  isFlowRunning: boolean;
  onUpdateNodeData: (nodeId: string, patch: Partial<CanvasNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onRunNode: (nodeId: string) => void;
  // Swaps a model node to another model of the same kind, dropping wires the new model cannot take.
  onSwapModel: (nodeId: string, modelId: string) => void;
  // Reorders one incoming edge on a multi-connection handle, such as concat videos.
  onReorderTargetEdges: (
    nodeId: string,
    targetHandle: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  // Character node: generate a new outfit from the connected wardrobe inputs.
  onGenerateOutfit?: (nodeId: string) => void;
  // Empty character node: save the Seedream blueprint into the character library.
  onSaveCharacterBlueprint?: (nodeId: string) => void | Promise<void>;
  onOpenLightbox: (item: CanvasLightboxItem) => void;
  // Starts or retries free Explainer planning on a planning card.
  onPlanExplainer: (nodeId: string) => void;
  // Expands a Swap or Teleport director into trim → render → grade.
  onBuildScroDirector: (nodeId: string) => void;
  // Nodes whose preview is an old version and why.
  outdatedNodes: ReadonlyMap<string, OutdatedReason>;
  // Opens the bottom timeline drawer for a Sequence node.
  onOpenTimeline?: (nodeId: string) => void;
  // Replaces a concat chain with one Sequence node.
  onConvertConcat?: (nodeId: string) => void;
  // Explainer / Talking Head Director: join clips with Concat nodes or one Sequence.
  onSetDirectorClipJoin?: (directorId: string, mode: "concat" | "sequence") => void;
};

export const CanvasNodeActionsContext =
  createContext<CanvasNodeActionsContextValue | null>(null);

export function useCanvasNodeActions(): CanvasNodeActionsContextValue {
  const ctx = useContext(CanvasNodeActionsContext);
  if (!ctx) {
    throw new Error("useCanvasNodeActions must be used inside CanvasNodeActionsContext");
  }
  return ctx;
}
