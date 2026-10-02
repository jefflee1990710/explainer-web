import { stylesCollection } from "@/dao";
import type { StyleDoc } from "@/model/style-doc";
import {
  DEFAULT_STYLE_ID,
  STYLES,
  isStyleId,
  type Style,
  type StyleId,
} from "@/service/style/catalog";

// Prompt-driving fields written to Mongo `styles` (previews stay separate).
export const STYLE_PROMPT_KEYS = [
  "name",
  "nameZh",
  "description",
  "canvas",
  "canvasColor",
  "look",
  "palette",
  "typography",
  "motion",
  "negatives",
] as const;

export type StylePromptFields = Pick<Style, (typeof STYLE_PROMPT_KEYS)[number]>;

// $set payload for seed / patch — never includes preview* fields.
export function catalogStyleFields(style: StylePromptFields): StylePromptFields {
  return {
    name: style.name,
    nameZh: style.nameZh,
    description: style.description,
    canvas: style.canvas,
    canvasColor: style.canvasColor,
    look: style.look,
    palette: style.palette,
    typography: style.typography,
    motion: style.motion,
    negatives: style.negatives,
  };
}

// Complete Mongo style → runtime Style; incomplete docs fall through to catalog.
export function styleFromDoc(doc: StyleDoc | null | undefined): Style | null {
  if (!doc || !isStyleId(doc._id)) return null;
  for (const key of STYLE_PROMPT_KEYS) {
    if (typeof doc[key] !== "string" || !doc[key].trim()) return null;
  }
  return {
    id: doc._id,
    ...catalogStyleFields(doc as StyleDoc & StylePromptFields),
  };
}

let overlay: Partial<Record<StyleId, Style>> = {};

// Catalog unless hydrateStyles has loaded a complete Mongo doc for this id.
export function resolvedStyle(id: string | undefined): Style {
  const key = isStyleId(id) ? id : DEFAULT_STYLE_ID;
  return overlay[key] ?? STYLES[key];
}

export function replaceStyleOverlay(styles: Style[]) {
  overlay = Object.fromEntries(styles.map((style) => [style.id, style]));
}

export function resetStyleOverlay() {
  overlay = {};
}

// Load every complete style doc into the overlay used by resolvedStyle.
export async function hydrateStyles() {
  const docs = await (await stylesCollection()).find({}).toArray();
  const next: Partial<Record<StyleId, Style>> = {};
  for (const doc of docs) {
    const style = styleFromDoc(doc);
    if (style) next[style.id] = style;
  }
  overlay = next;
}

// Mongo style if complete, otherwise the catalog fallback.
export async function loadStyle(id: string | undefined): Promise<Style> {
  await hydrateStyles();
  return resolvedStyle(id);
}
