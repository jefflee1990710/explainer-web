"use client";

// Shared port colors, runtime status styles, and React Context for Canvas node cards.

import { createContext, useContext } from "react";
import type { CanvasEdge, CanvasNodeData } from "@/model/canvas";
import type {
  CanvasModelCategory,
  CanvasModelSpec,
  CanvasPortType,
} from "@/service/canvas/model-catalog";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";

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
  edges: readonly CanvasEdge[];
  characterOptions: readonly CanvasLibraryCharacterOption[];
  locale: string;
  isFlowRunning: boolean;
  onUpdateNodeData: (nodeId: string, patch: Partial<CanvasNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onRunNode: (nodeId: string) => void;
  onOpenLightbox: (item: CanvasLightboxItem) => void;
  // Starts or retries free Explainer planning on a planning card.
  onPlanExplainer: (nodeId: string) => void;
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
