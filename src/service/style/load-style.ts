import { stylesCollection } from "@/dao";
import {
  isStyleId,
  resolveStyleId,
  type StyleId,
} from "@/model/style-id";
import type { StyleDoc } from "@/model/style-doc";
import { applyChalkboardMonochrome } from "@/service/style/chalkboard-monochrome";
import { applyCinematicLenses } from "@/service/style/cinematic-lenses";
import { ensureCatalogStyles } from "@/service/style/ensure-catalog-styles";
import { LETTERING_KEYS } from "@/service/style/lettering";
import type { Style } from "@/service/style/types";

// Prompt-driving fields stored on Mongo `styles` (previews stay separate).
export const STYLE_PROMPT_KEYS = [
  "name",
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
export function stylePromptFields(style: StylePromptFields): StylePromptFields {
  return {
    name: style.name,
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

function optionalLettering(style: Partial<Style> | StyleDoc): Pick<Style, (typeof LETTERING_KEYS)[number]> {
  const next: Pick<Style, (typeof LETTERING_KEYS)[number]> = {};
  for (const key of LETTERING_KEYS) {
    const value = style[key];
    if (typeof value === "string" && value.trim()) next[key] = value.trim();
  }
  return next;
}

// Complete Mongo style → runtime Style; incomplete docs are not usable.
export function styleFromDoc(doc: StyleDoc | null | undefined): Style | null {
  if (!doc || !isStyleId(doc._id)) return null;
  for (const key of STYLE_PROMPT_KEYS) {
    if (typeof doc[key] !== "string" || !doc[key].trim()) return null;
  }
  return applyCinematicLenses(applyChalkboardMonochrome({
    id: doc._id,
    ...stylePromptFields(doc as StyleDoc & StylePromptFields),
    ...optionalLettering(doc),
  }));
}

let overlay: Partial<Record<StyleId, Style>> = {};

// Requires hydrateStyles (or replaceStyleOverlay) to have loaded this id.
export function resolvedStyle(id: string | undefined): Style {
  const key = resolveStyleId(id);
  const style = overlay[key];
  if (!style) {
    throw new Error(`Style "${key}" is missing from Mongo`);
  }
  return style;
}

export function replaceStyleOverlay(styles: Style[]) {
  overlay = Object.fromEntries(styles.map((style) => [style.id, style]));
}

export function resetStyleOverlay() {
  overlay = {};
}

// Load every complete style doc into the overlay used by resolvedStyle.
export async function hydrateStyles() {
  await ensureCatalogStyles();
  const docs = await (await stylesCollection()).find({}).toArray();
  const next: Partial<Record<StyleId, Style>> = {};
  for (const doc of docs) {
    const style = styleFromDoc(doc);
    if (style) next[style.id] = style;
  }
  overlay = next;
}

// Mongo style if complete; throws when the doc is missing or incomplete.
export async function loadStyle(id: string | undefined): Promise<Style> {
  await hydrateStyles();
  return resolvedStyle(id);
}
