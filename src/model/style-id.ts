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
  "low-poly",
  "colored-pencil",
  "dark-tech",
  "cave-painting",
  "egyptian-wall",
  "attic-black-figure",
  "roman-mosaic",
  "gothic-illumination",
  "high-renaissance",
  "ukiyo-e",
  "impressionism",
  "post-impressionism",
  "art-nouveau",
  "cubism",
  "bauhaus",
  "pop-art",
  "eight-bit",
  "ray-traced",
  "flat-illustration",
  "cream-poster",
  "highlighter-notes",
  "grid-icons",
  "proof-poster",
  "data-ring",
  "wireframe-breakdown",
  "japanese-anime",
  "papercraft-diorama",
] as const;

export const styleIdSchema = z.enum(STYLE_IDS);

export type StyleId = z.infer<typeof styleIdSchema>;

export const DEFAULT_STYLE_ID: StyleId = "doodle";

// Style pre-selected in pickers when the user has no saved preference. DEFAULT_STYLE_ID stays the legacy fallback.
export const PICKER_DEFAULT_STYLE_ID: StyleId = "realistic";

// Picker default limited to the styles on offer.
export function pickerDefaultStyleId(offered: ReadonlyArray<{ id: string }>): string {
  if (offered.length === 0 || offered.some((style) => style.id === PICKER_DEFAULT_STYLE_ID)) {
    return PICKER_DEFAULT_STYLE_ID;
  }
  return offered[0].id;
}

export function isStyleId(value: string | undefined): value is StyleId {
  return Boolean(value && (STYLE_IDS as readonly string[]).includes(value));
}

// Normalize legacy/LLM alias "cinematic-realistic" to canonical "realistic".
export function normalizeStyleId(value: string | undefined): string | undefined {
  if (!value) return value;
  const trimmed = value.trim();
  if (/^cinematic[-_\s]+realistic$/i.test(trimmed)) return "realistic";
  return trimmed;
}

// Old videos have no styleId; anything unknown is the original doodle look.
export function resolveStyleId(id: string | undefined): StyleId {
  const normalized = normalizeStyleId(id);
  return isStyleId(normalized) ? normalized : DEFAULT_STYLE_ID;
}
