import {
  isStyleId,
  resolveStyleId,
  type StyleId,
} from "@/model/style-id";
import type { StyleDoc } from "@/model/style-doc";
import { defaultStyleBehavior } from "@/model/style";
import { STYLES_BY_ID } from "@/service/style/catalog";
import { LETTERING_KEYS } from "@/service/style/lettering";
import type { Style } from "@/service/style/types";

// Prompt-driving fields on a style definition (previews stay separate).
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

export function styleFromDoc(doc: StyleDoc | null | undefined): Style | null {
  if (!doc || !isStyleId(doc._id)) return null;
  for (const key of STYLE_PROMPT_KEYS) {
    if (typeof doc[key] !== "string" || !doc[key].trim()) return null;
  }
  return {
    id: doc._id,
    ...stylePromptFields(doc as StyleDoc & StylePromptFields),
    ...optionalLettering(doc),
    behavior: defaultStyleBehavior(doc._id, doc.canvas),
  };
}

let overlay: Partial<Record<StyleId, Style>> | null = null;

// Resolves from test overlay when installed, otherwise directly from the hardcoded catalog.
export function resolvedStyle(id: string | undefined): Style {
  const key = resolveStyleId(id);
  if (overlay) {
    const overridden = overlay[key];
    if (overridden) return overridden;
  }
  return STYLES_BY_ID[key];
}

export function replaceStyleOverlay(styles: Style[]) {
  overlay = Object.fromEntries(styles.map((style) => [style.id, style]));
}

export function resetStyleOverlay() {
  overlay = null;
}

// No-op: all 35 built-in styles now live in `src/service/style/catalog/*.ts`.
export async function hydrateStyles() {
  return;
}

export async function loadStyle(id: string | undefined): Promise<Style> {
  return resolvedStyle(id);
}
