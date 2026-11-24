import { z } from "zod";

// Free key-value pairs that fill `{{key}}` placeholders in wired prompts.
export type SettingsVars = Record<string, string>;

// A Setting node: one key-value map, wired into a Director, model, or Prompt node.
export type CanvasSettingsData = { vars: SettingsVars };

export const SETTINGS_VAR_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;

// passthrough keeps legacy fields (kind, values, applied…) until the load migration rewrites them.
export const canvasSettingsDataSchema = z
  .object({ vars: z.record(z.string().regex(SETTINGS_VAR_KEY), z.string().max(4000)).default({}) })
  .passthrough() as unknown as z.ZodType<CanvasSettingsData>;
