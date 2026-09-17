// Visual styles for character blueprints. Separate from director Skills;
// the same catalog will drive video style selection later.
export type StyleId = "doodle";

export type Style = {
  id: StyleId;
  name: string;
  nameZh: string;
  promptFragment: string;
};

export const STYLE_IDS: StyleId[] = ["doodle"];

export const STYLES: Record<StyleId, Style> = {
  doodle: {
    id: "doodle",
    name: "Whiteboard doodle",
    nameZh: "白板塗鴉手繪",
    promptFragment:
      "Whiteboard doodle cartoon: bold irregular black marker outlines, flat marker fills, hand-drawn feel, no photorealism, no gradients, no chalkboard.",
  },
};

export function isStyleId(value: string | undefined): value is StyleId {
  return Boolean(value && STYLE_IDS.includes(value as StyleId));
}
