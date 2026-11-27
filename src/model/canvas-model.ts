// Pure model specification types and shared constants for the Interactive Node Canvas.
// Zero runtime dependencies on `@/service/*` or `@/dao`.

export type CanvasPortType = "image" | "video" | "audio" | "text";

export type CanvasModelCategory =
  | "image"
  | "video"
  | "audio"
  | "scro-tool"
  | "ffmpeg"
  | "editing"
  | "segmentation"
  | "upscale";

export type CanvasModelProvider =
  | "mentalok"
  | "openrouter"
  | "google"
  | "minimax"
  | "argolink"
  | "scro"
  | "ffmpeg";

export type CanvasBilingualLabel = {
  "zh-Hant": string;
  en: string;
};

export type CanvasPortSpec = {
  id: string;
  label: string;
  labels: CanvasBilingualLabel;
  type: CanvasPortType;
  required: boolean;
  multiple: boolean;
  maxConnections: number;
};

export type CanvasModelOutputSpec = {
  id: "output";
  label: string;
  labels: CanvasBilingualLabel;
  type: "image" | "video" | "audio" | "text";
};

// A second file the node writes next to its main output (FFmpeg Split's part B).
export type CanvasModelExtraOutputSpec = Omit<CanvasModelOutputSpec, "id"> & { id: string };

export type CanvasModelRuntimeStatus =
  | "warm"
  | "cached"
  | "cold"
  | "booting"
  | "busy"
  | "unavailable";

// One `toolParams` key a node accepts. The assistant allowlist and prompt are built from these.
export type CanvasToolParamSpec = {
  key: string;
  kind: "number" | "string" | "boolean" | "enum";
  values?: readonly string[];
  min?: number;
  max?: number;
  // Short English note for the assistant prompt.
  hint?: string;
};

export type CanvasModelSpec = {
  id: string;
  provider: CanvasModelProvider;
  providerModelId: string;
  name: string;
  category: CanvasModelCategory;
  inputs: CanvasPortSpec[];
  output: CanvasModelOutputSpec;
  presets: string[];
  defaultPresetId: string;
  basePriceUsd: number;
  defaultDurationSeconds?: number;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  supportsAspectRatio?: boolean;
  supportsResolution?: boolean;
  runtimeStatus?: CanvasModelRuntimeStatus;
  available?: boolean;
  // Created only by other features (e.g. Explainer expansion); not listed in the sidebar or agent catalog.
  hiddenInSidebar?: boolean;
  // Every toolParams key the node reads; the assistant may set only these.
  toolParams?: readonly CanvasToolParamSpec[];
  // One-line assistant note on what the node does.
  agentHint?: string;
  // Named outputs besides "output"; edges pick one with sourceHandle.
  extraOutputs?: readonly CanvasModelExtraOutputSpec[];
};

export const CANVAS_HEYGEN_MAX_VIDEO_SECONDS = 120;
