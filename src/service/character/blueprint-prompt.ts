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

// Chalkboard's canvas is the drawing surface. Every other style keeps a light sheet.
function usesDrawingSurface(style: RenderableStyle) {
  return /chalkboard/i.test(`${style.id} ${style.canvas}`);
}

// Flat light ground. The tint is chosen so it stays apart from the outfit.
const LIGHT_SHEET_GROUND = [
  "Sheet ground: ignore any scene, room, street, or environment named in Background. The empty area behind every pose is one flat light solid colour, evenly lit, with no texture, gradient, cast shadow, or setting.",
  "Choose that light colour from the character's clothing. It must stay light, and it must not match the outfit. Dark or saturated clothes get a warm off-white. Pale or light clothes get a light grey or a faint contrasting tint so the silhouette still reads. Use that same ground colour for the whole canvas.",
].join(" ");

// Likeness from the photo; rendering must still follow the chosen style.
function identityFromReference(style: RenderableStyle) {
  const styleRule = usesDrawingSurface(style)
    ? `Style is required: follow Background, Rendering, Palette, and Never. The sheet must look like ${style.name}, not a photograph or an unstyled copy of the reference.`
    : `Style is required: follow Rendering, Palette, and Never. The empty ground follows the sheet-ground rule, not a scene named in Background. The character must look like ${style.name}, not an unstyled copy of the reference.`;
  return [
    `Keep the reference's 五官比例 and 整體氣質, and redraw every pose in the ${style.name} style.`,
    "五官比例: copy face shape, eye spacing and shape, brows, nose, mouth, lips, jaw, chin, plus moles, scars, and other marks.",
    "整體氣質: keep the same aura, presence, and how they feel to look at — not a generic stand-in.",
    styleRule,
    "Do not drop the style to protect likeness, and do not drop likeness to apply the style.",
    ...(style.id === "chalkboard"
      ? [
          "Chalkboard is monochrome: keep 五官比例 and 整體氣質 as white chalk stroke and value on the dark slate, never as skin tone, hair dye, or clothing colour.",
        ]
      : []),
  ];
}

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
  const lightGround = !usesDrawingSurface(input.style);
  const lines = [
    ...SHEET_LAYOUT,
    ...styleLinesForBlueprint(input.style),
    ...(lightGround ? [LIGHT_SHEET_GROUND] : []),
  ];
  if (description) lines.push(`Character: ${description}`);
  if (input.editInstruction) {
    lines.push(
      "Use the reference sheet as the base. Apply only the change below; keep everything else identical, including layout, pose order, expression order, 五官比例, 整體氣質, and the same visual style.",
    );
    if (lightGround) {
      lines.push(
        "If the reference sheet shows a dark or scenic background, replace only that ground with the light sheet-ground colour. Do not copy the setting.",
      );
    }
    if (referenceCount > 1) {
      lines.push(
        "The first reference image is that current character sheet.",
        "Every reference image after the first is an original photo of this character. Match 五官比例 and 整體氣質 to those original photos so the face does not drift away from them.",
      );
    }
    lines.push(`Change: ${input.editInstruction.trim()}`);
  } else if (hasReference && referenceCount > 1) {
    lines.push(
      ...identityFromReference(input.style),
      "Fuse all attached reference images into one character of the same identity.",
      "Prefer clear close-ups for 五官比例 and full-body shots for proportions and outfit.",
      "Do not invent a different character or average them into a generic look.",
    );
  } else if (hasReference && description) {
    lines.push(
      ...identityFromReference(input.style),
      "The Character line may add age, role, or clothing hints; it must not replace the face proportions, temperament, or the required style.",
    );
  } else if (hasReference) {
    // Image-only create: infer identity from the photo, then redraw in style.
    lines.push(
      ...identityFromReference(input.style),
      "Derive the character entirely from the attached reference image.",
      `Redraw that same person or character as this ${input.style.name} model sheet.`,
    );
  }
  return lines.join("\n");
}

// Full-body standing preview taken from the finished sheet. Cards and pickers show this.
export function buildProfilePrompt(input: { style: RenderableStyle; description: string }) {
  const lightGround = !usesDrawingSurface(input.style);
  const description = input.description.trim();
  const lines = [
    "One full-body standing view of the same character as the attached character sheet.",
    "Use only the front view from the sheet. One person, standing, facing the camera, neutral expression, eyes open, arms relaxed at the sides.",
    "Copy face, hair, outfit, and rendering from that front view. Do not copy the turnaround, walk cycle, expression grid, labels, or extra poses.",
    "Framing: the entire body is visible, from the top of the hair to the soles of the feet, centered, with empty margin above the head and below the feet. Do not crop to a head-and-shoulders portrait.",
    ...styleLinesForBlueprint(input.style),
    lightGround
      ? LIGHT_SHEET_GROUND
      : "The figure stands on the same drawing surface as the sheet.",
  ];
  if (description) lines.push(`Character: ${description}`);
  return lines.join("\n");
}
