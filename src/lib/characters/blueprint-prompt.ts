import { STYLES, type StyleId } from "@/lib/styles";

// Fixed character-sheet layout so every version is comparable side by side.
const SHEET_LAYOUT = [
  "Character model sheet on a single 16:9 canvas, solid white background, no text, no labels, no drop shadows, consistent scale across all drawings.",
  "Framing: scale the whole sheet down so every drawing fits fully inside the canvas with generous white padding on all four sides. Leave at least 8% empty margin on the top, bottom, left, and right. Nothing may touch, clip, or extend beyond the image border — no cropped heads, hair, hands, or feet.",
  "Left two thirds: top row is a full-body turnaround of the same character standing in front, back, left, and right views; bottom row is a 4-pose walk cycle of the same character moving left to right. Keep each pose small enough that all four turnaround views and all four walk poses are completely visible.",
  "Right third: a 3 by 4 grid of head-and-shoulders expressions in this order: neutral, smile, frown, laugh, angry, surprised, curious, worried, sad, focused, shy, sleepy. Each expression must fit entirely inside its cell with clear spacing.",
];

export function buildBlueprintPrompt(input: {
  styleId: StyleId;
  description: string;
  hasReference: boolean;
  editInstruction?: string;
}) {
  const description = input.description.trim();
  const lines = [...SHEET_LAYOUT, STYLES[input.styleId].promptFragment];
  if (description) lines.push(`Character: ${description}`);
  if (input.editInstruction) {
    lines.push(
      "Use the reference sheet as the base. Apply only the change below; keep everything else identical, including layout, pose order, and expression order.",
      `Change: ${input.editInstruction.trim()}`,
    );
  } else if (input.hasReference && description) {
    lines.push("Preserve the appearance of the character in the reference image.");
  } else if (input.hasReference) {
    // Image-only create: infer identity from the photo, then redraw in style.
    lines.push(
      "Derive the character entirely from the attached reference image.",
      "Redraw that same person or character as this model sheet in the specified style.",
      "Keep face, hair, body, clothing, and distinguishing features recognizable. Do not invent a different character.",
    );
  }
  return lines.join("\n");
}
