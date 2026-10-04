import { styleLinesForBlueprint } from "@/service/style";
import type { RenderableStyle } from "@/service/style/renderable-style";

// Fixed character-sheet layout so every version is comparable side by side.
// GPT Image maps 16:9 requests to a 3:2 frame; keep the prompt aligned with that.
const SHEET_LAYOUT = [
  "Character model sheet on a single 3:2 landscape canvas, no text, no labels, no drop shadows, consistent scale across all drawings.",
  "Framing: zoom out. Draw the entire sheet small and centered with wide empty margins on every side. Leave at least 12% blank margin on the top, bottom, left, and right. Nothing may touch, clip, or extend beyond the image border — no cropped heads, hair, hands, or feet.",
  "Left two thirds: top row is a full-body turnaround of the same character standing in front, back, left, and right views; bottom row is a 4-pose walk cycle of the same character moving left to right. Keep each pose small enough that all four turnaround views and all four walk poses are completely visible.",
  "Right third: a 3 by 4 grid of head-and-shoulders expressions in this order: neutral, smile, frown, laugh, angry, surprised, curious, worried, sad, focused, shy, sleepy. Each expression must fit entirely inside its cell with clear spacing.",
  "Final check: every drawing must be fully visible with an empty margin between the artwork and all four edges of the canvas.",
];

// Face geometry and temperament outrank look/palette when a photo is attached.
const IDENTITY_FROM_REFERENCE = [
  "Identity lock: facial feature proportions and overall temperament from the attached reference outrank the style.",
  "Copy the 五官比例 exactly — face shape, eye spacing and shape, brows, nose, mouth, lips, jaw, chin — plus moles, scars, and other marks.",
  "Keep the same 整體氣質: the person's aura, presence, and how they feel to look at. Do not replace them with a generic stylized stand-in.",
  "Restyle medium and palette only after those proportions and that temperament are locked. A different face is a failed sheet.",
];

export function buildBlueprintPrompt(input: {
  style: RenderableStyle;
  description: string;
  hasReference?: boolean;
  referenceCount?: number;
  editInstruction?: string;
}) {
  const description = input.description.trim();
  const referenceCount = input.referenceCount ?? (input.hasReference ? 1 : 0);
  const hasReference = referenceCount > 0;
  const lines = [
    ...SHEET_LAYOUT,
    ...styleLinesForBlueprint(input.style),
  ];
  if (description) lines.push(`Character: ${description}`);
  if (input.editInstruction) {
    lines.push(
      "Use the reference sheet as the base. Apply only the change below; keep everything else identical, including layout, pose order, expression order, 五官比例, and 整體氣質.",
      `Change: ${input.editInstruction.trim()}`,
    );
  } else if (hasReference && referenceCount > 1) {
    lines.push(
      ...IDENTITY_FROM_REFERENCE,
      "Fuse all attached reference images into one character of the same identity.",
      "Prefer clear close-ups for 五官比例 and full-body shots for proportions and outfit.",
      "Do not invent a different character or average them into a generic look.",
    );
  } else if (hasReference && description) {
    lines.push(
      ...IDENTITY_FROM_REFERENCE,
      "The Character line may add age, role, or clothing hints; it must not replace the face proportions or temperament.",
    );
  } else if (hasReference) {
    // Image-only create: infer identity from the photo, then redraw in style.
    lines.push(
      ...IDENTITY_FROM_REFERENCE,
      "Derive the character entirely from the attached reference image.",
      "Redraw that same person or character as this model sheet in the specified style.",
    );
  }
  return lines.join("\n");
}
