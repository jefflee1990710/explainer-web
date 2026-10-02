import { STYLE_IDS } from "@/model/style-id";

// Shared composition: one director type, restaged in every catalog style.
export const DIRECTOR_PREVIEW_SCENE =
  "16:9 storyboard card. MUST be a 3 by 3 grid of nine equal cells — never a single full-bleed frame. The SAME director-format moment in every cell, each cell a different visual style. Thin even gutters, no watermarks, no UI chrome, no readable paragraph text. The director type must be obvious in every cell.";

// Gemini image prompt for a system-director card still.
export function directorPreviewPrompt(input: {
  title: string;
  visual: string;
  styleNames: string[];
}) {
  const cells = input.styleNames
    .map((name, index) => `${index + 1}. ${name}`)
    .join("; ");
  return [
    DIRECTOR_PREVIEW_SCENE,
    `Director type (repeat this beat in all nine cells): ${input.title}.`,
    `What this format looks like: ${input.visual}`,
    `Cells left-to-right, top-to-bottom must use these styles exactly: ${cells}.`,
    `Keep the cast, props and action identical; only the rendering style changes.`,
  ].join("\n");
}

export function directorPreviewStyleNames(styles: { id: string; name: string }[]) {
  return STYLE_IDS.map((id) => {
    const style = styles.find((row) => row.id === id);
    if (!style?.name.trim()) {
      throw new Error(`Style "${id}" is missing from Mongo`);
    }
    return style.name;
  });
}
