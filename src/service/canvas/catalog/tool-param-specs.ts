// Builders for the toolParams each FFmpeg spec declares (assistant allowlist + prompt).

import type { CanvasToolParamSpec } from "@/model/canvas-model";

export const num = (key: string, min: number, max: number, hint?: string): CanvasToolParamSpec => ({
  key,
  kind: "number",
  min,
  max,
  ...(hint ? { hint } : {}),
});

export const oneOf = (key: string, values: readonly string[], hint?: string): CanvasToolParamSpec => ({
  key,
  kind: "enum",
  values,
  ...(hint ? { hint } : {}),
});

export const flag = (key: string, hint?: string): CanvasToolParamSpec => ({
  key,
  kind: "boolean",
  ...(hint ? { hint } : {}),
});

export const text = (key: string, hint?: string): CanvasToolParamSpec => ({
  key,
  kind: "string",
  ...(hint ? { hint } : {}),
});
