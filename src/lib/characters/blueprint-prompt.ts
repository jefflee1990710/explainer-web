import { STYLES, type StyleId } from "@/lib/styles";

// Fixed character-sheet layout so every version is comparable side by side.
const SHEET_LAYOUT = [
  "Character model sheet on a single 16:9 canvas, solid white background, no text, no labels, no drop shadows, consistent scale across all drawings.",
  "Left two thirds: top row is a full-body turnaround of the same character standing in front, back, left, and right views; bottom row is a 4-pose walk cycle of the same character moving left to right.",
  "Right third: a 3 by 4 grid of head-and-shoulders expressions in this order: neutral, smile, frown, laugh, angry, surprised, curious, worried, sad, focused, shy, sleepy.",
];

export function buildBlueprintPrompt(input: {
  styleId: StyleId;
  description: string;
  hasReference: boolean;
  editInstruction?: string;
}) {
  const lines = [
    ...SHEET_LAYOUT,
    STYLES[input.styleId].promptFragment,
    `Character: ${input.description.trim()}`,
  ];
  if (input.editInstruction) {
    lines.push(
      "Use the reference sheet as the base. Apply only the change below; keep everything else identical, including layout, pose order, and expression order.",
      `Change: ${input.editInstruction.trim()}`,
    );
  } else if (input.hasReference) {
    lines.push("Preserve the appearance of the character in the reference image.");
  }
  return lines.join("\n");
}
