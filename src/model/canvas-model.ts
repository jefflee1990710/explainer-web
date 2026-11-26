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

export type CanvasModelRuntimeStatus =
  | "warm"
  | "cached"
  | "cold"
  | "booting"
  | "busy"
  | "unavailable";

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
};

export const CANVAS_HEYGEN_MAX_VIDEO_SECONDS = 120;
