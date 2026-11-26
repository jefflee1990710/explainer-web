// Pure JSON-safe DTO and input types for the Interactive Node Canvas Editor (/app/canvas).
// Zero runtime or database imports so Client Components can safely import these types.

import type {
  CanvasEdge,
  CanvasFlowRunStatus,
  CanvasGroup,
  CanvasJobStatus,
  CanvasNode,
  CanvasOutputKind,
  CanvasViewport,
} from "@/model/canvas";
import type { CanvasModelProvider } from "@/service/canvas/model-catalog";

export type CanvasProjectSummaryDto = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  nodeCount: number;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CanvasFlowRunDto = {
  flowRunId: string;
  status: CanvasFlowRunStatus;
  currentWave: number;
  totalWaves: number;
  failedNodeIds: string[];
  error?: string;
};

export type CanvasProjectDto = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  viewport: CanvasViewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  activeFlowRun?: CanvasFlowRunDto;
  createdAt: string;
  updatedAt: string;
};

export type CanvasJobDto = {
  id: string;
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  provider: CanvasModelProvider;
  modelId: string;
  providerModelId: string;
  presetId?: string;
  status: CanvasJobStatus;
  externalJobId?: string;
  chargedUsd: number;
  refundedAt?: string;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type CanvasLibraryAsset = {
  id: string;
  source: "character" | "product" | "canvas_output" | "outfit";
  name: string;
  mediaKind: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  // Face and standing figure, shown together when this asset is a character choice.
  portraitUrl?: string;
  fullBodyUrl?: string;
  createdAt: string;
  // Set on outfit tiles so a drop lands on the matching character input.
  outfitPart?: "hair" | "top" | "pants" | "shoes" | "accessory" | "look";
  outfitPrompt?: string;
  characterId?: string;
};

export type CanvasLibraryCharacterOption = {
  id: string;
  name: string;
  previewUrl?: string;
  // Identity close-up and standing figure, shown together in the character menu.
  portraitUrl?: string;
  fullBodyUrl?: string;
};

export type CanvasLibraryAssetsResult = {
  characters: CanvasLibraryAsset[];
  outfits: CanvasLibraryAsset[];
  products: CanvasLibraryAsset[];
  recentOutputs: CanvasLibraryAsset[];
  characterOptions: CanvasLibraryCharacterOption[];
};

export type CreateCanvasProjectInput = {
  title?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
  thumbnailUrl?: string;
  folderId?: string;
};

export type SaveCanvasProjectPatch = {
  title?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  groups?: CanvasGroup[];
  viewport?: CanvasViewport;
  thumbnailUrl?: string;
};
