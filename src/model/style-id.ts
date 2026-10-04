import { z } from "zod";

export const STYLE_IDS = [
  "doodle",
  "flat-vector",
  "paper-cutout",
  "chalkboard",
  "chalkboard-color",
  "watercolor",
  "clay",
  "pixel",
  "ink-manga",
  "realistic",
] as const;

export const styleIdSchema = z.enum(STYLE_IDS);

export type StyleId = z.infer<typeof styleIdSchema>;

export const DEFAULT_STYLE_ID: StyleId = "doodle";

export function isStyleId(value: string | undefined): value is StyleId {
  return Boolean(value && (STYLE_IDS as readonly string[]).includes(value));
}

// Old videos have no styleId; anything unknown is the original doodle look.
export function resolveStyleId(id: string | undefined): StyleId {
  return isStyleId(id) ? id : DEFAULT_STYLE_ID;
}
