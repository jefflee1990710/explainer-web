import { characterSpecBlock, type CharacterSpec } from "@/model/character-spec";
import { styleLinesForBlueprint } from "@/service/style";
import type { RenderableStyle } from "@/service/style/renderable-style";
import {
  fitReferencePrompt,
  isRealisticStyle,
  REALISTIC_CHARACTER_RENDER_RULE,
} from "@/service/style/realistic-light";

// Fixed character-sheet layout so every version is comparable side by side.
// GPT Image maps 16:9 requests to a 3:2 frame; keep the prompt aligned with that.
const SHEET_LAYOUT = [
  "Character model sheet on a single 3:2 landscape canvas, no text, no labels, no drop shadows, consistent scale across all drawings.",
  "Framing: zoom out, the sheet small and centered. Leave at least 12% blank margin on the top, bottom, left, and right. Nothing may touch, clip, or extend beyond the image border.",
  "Left two thirds: top row is a full-body turnaround of the same character standing in front, back, left, and right views; bottom row is a 4-pose walk cycle of the same character moving left to right. Keep every pose fully visible.",
  "Right third: a 3 by 4 grid of head-and-shoulders expressions in this order: neutral, smile, frown, laugh, angry, surprised, curious, worried, sad, focused, shy, sleepy. Each expression must fit entirely inside its cell with clear spacing.",
  "Final check: every drawing must be fully visible with an empty margin between the artwork and all four edges of the canvas.",
];

// Strip scene-only dramatic lighting terms from style lines on character blueprints.
function characterBlueprintStyleLines(style: RenderableStyle) {
  if (!isRealisticStyle(style)) return styleLinesForBlueprint(style);
  return styleLinesForBlueprint({
    ...style,
    look: style.look
      .replace(
        /sculpted by[^.]+?\([^)]+\),\s*/i,
        "sculpted by directional three-quarter window daylight with a dimensional 1.4:1 to 1.8:1 portrait contrast ratio (25–40% shadow falloff with negative fill on the far cheek that highlights skin pores and micro-relief while keeping both eyes clearly readable), ",
      ),
    palette:
      style.palette.length > 100
        ? "rich daylight skin tones and dimensional 1.4:1–1.8:1 three-quarter contrast on Kodak Gold 200 film stock (neutral-cool key light on skin with negative fill on the shadow side)"
        : style.palette,
  });
}
// Chalkboard's canvas is the drawing surface. Every other style keeps a light sheet.
function usesDrawingSurface(style: RenderableStyle) {
  return /chalkboard/i.test(`${style.id} ${style.canvas}`);
}

// Flat light ground. The tint is chosen so it stays apart from the outfit.
const LIGHT_SHEET_GROUND = [
  "Sheet ground: ignore any scene, room, street, or environment named in Background. The empty area behind every pose is one flat light solid colour, evenly lit, with no texture, gradient, cast shadow, or setting.",
  "Choose that light colour from the character's clothing. It must stay light, and it must not match the outfit. Dark or saturated clothes get a warm off-white. Pale or light clothes get a light grey or a faint contrasting tint so the silhouette still reads. Use that same ground colour for the whole canvas.",
].join(" ");

// Hairstyle is part of the identity. A new pose or a tight crop must not restyle it.
function hairFromReference(style: RenderableStyle) {
  const shape =
    "Hair: copy the reference exactly (length, colour, parting, and how it is worn). Do not tie it back, add a ponytail, or restyle it.";
  if (style.id === "chalkboard") {
    return "Hair: copy the reference exactly (length, parting, and how it is worn) as chalk strokes. Do not tie it back or restyle it, and do not copy hair dye colour.";
  }
  return shape;
}

// Likeness from the photo; rendering must still follow the chosen style.
function identityFromReference(style: RenderableStyle) {
  const styleRule = usesDrawingSurface(style)
    ? `Style is required: follow Background, Rendering, Palette, and Never. The sheet must look like ${style.name}, not a photograph or an unstyled copy of the reference.`
    : `Style is required: follow Rendering, Palette, and Never. The empty ground follows the sheet-ground rule, not a scene named in Background. The character must look like ${style.name}, not an unstyled copy of the reference.`;
  return [
    `Keep the reference's 五官比例 and 整體氣質, and redraw every pose in the ${style.name} style, always standing straight upright facing the camera with a gentle little smile (never copy a seated or angled reference pose).`,
    "五官比例: copy face shape, eye spacing and shape, brows, nose, mouth, lips, jaw, chin, plus moles, scars, and other marks.",
    hairFromReference(style),
    "整體氣質: keep the same aura, presence, and how they feel to look at — not a generic stand-in.",
    ...(style.id === "chalkboard"
      ? []
      : [
          "Skin texture: focus on and faithfully preserve the source image's exact skin texture — copy natural pores, skin micro-texture, surface finish, fine lines, freckles, and skin details from the source image without airbrushing, over-smoothing, or replacing it with waxy plastic skin.",
        ]),
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
  const realistic = isRealisticStyle(input.style);
  const lines = [
    ...SHEET_LAYOUT,
    ...characterBlueprintStyleLines(input.style),
    ...(lightGround ? [LIGHT_SHEET_GROUND] : []),
    ...(realistic ? [REALISTIC_CHARACTER_RENDER_RULE] : []),
  ];
  if (description) lines.push(`Character: ${description}`);
  if (input.editInstruction) {
    lines.push(
      "Use the reference sheet as the base. Apply only the change below; keep everything else identical, including layout, pose order, expression order, 五官比例, 整體氣質, skin texture, and the same visual style.",
    );
    if (lightGround) {
      lines.push(
        "If the reference sheet shows a dark or scenic background, replace only that ground with the light sheet-ground colour. Do not copy the setting.",
      );
    }
    if (referenceCount > 1) {
      lines.push(
        "The first reference image is that current character sheet.",
        "Every reference image after the first is an original photo of this character. Match 五官比例, 整體氣質, and source skin texture to those original photos so the face does not drift away from them.",
      );
    }
    lines.push(`Change: ${input.editInstruction.trim()}`);
  } else if (hasReference && referenceCount > 1) {
    lines.push(
      ...identityFromReference(input.style),
      "Fuse all attached reference images into one character of the same identity.",
      "Prefer clear close-ups for 五官比例 and skin texture, and full-body shots for proportions, outfit, and the hairstyle.",
      "Do not invent a different character or average them into a generic look.",
    );
  } else if (hasReference && description) {
    lines.push(
      ...identityFromReference(input.style),
      "The Character line may add age, role, or clothing hints; it must not replace the face proportions, skin texture, temperament, or the required style.",
    );
  } else if (hasReference) {
    // Image-only create: infer identity from the photo, then redraw in style.
    lines.push(
      ...identityFromReference(input.style),
      "Derive the character entirely from the attached reference image.",
      `Redraw that same person or character as this ${input.style.name} model sheet.`,
    );
  }
  return fitReferencePrompt(lines);
}

// ---------- Blueprint board (portrait + full body) ----------

// Likeness rules shared by both board images. The spec is a text anchor; photos still win.
function boardIdentityLines(input: {
  style: RenderableStyle;
  spec?: CharacterSpec;
  photoCount: number;
}) {
  const lines: string[] = [];
  if (input.photoCount > 0) {
    lines.push(
      ...identityFromReference(input.style),
      ...(input.photoCount > 1
        ? [
            "Fuse all attached photos into one character of the same identity.",
            "Prefer clear close-ups for 五官比例 and skin texture, and full-body shots for proportions, outfit, and the hairstyle.",
            "Do not invent a different character or average them into a generic look.",
          ]
        : ["Derive the character entirely from the attached photo."]),
    );
  }
  if (input.spec) {
    lines.push(
      "Appearance notes read from the photos (keep every one of them; they describe the same person):",
      characterSpecBlock(input.spec),
    );
  }
  return lines;
}

type BoardPromptInput = {
  style: RenderableStyle;
  description: string;
  spec?: CharacterSpec;
  // Original photos attached after any parent images.
  photoCount: number;
  // Set when branching from a finished board: the parent's image(s) come first.
  editInstruction?: string;
  parentImageCount?: number;
};

// Identity portrait: head-and-shoulders, front, the face as large as the canvas allows.
// This is the image every later scene copies the face from, so nothing else is on it.
export function buildPortraitPrompt(input: BoardPromptInput) {
  const description = input.description.trim();
  const lightGround = !usesDrawingSurface(input.style);
  const realistic = isRealisticStyle(input.style);
  const lines = [
    "Character identity portrait on a square canvas: one person, head and shoulders, standing straight upright and facing the camera straight on (regardless of the reference photo's pose or angle), eyes open, looking into the lens, with a warm, gentle little smile. Changing the pose to front-on does not change the hair.",
    "The face fills most of the frame: top of the hair near the top edge with a small margin, shoulders cut at the bottom edge. Cutting long hair at the frame edge is fine; do not tie it back to fit. No hands, no props, no text, no labels, no frame or border, no second person.",
    realistic
      ? REALISTIC_CHARACTER_RENDER_RULE
      : "Even soft front light so every facial feature reads clearly: eye shape, brows, nose, lips, jaw, natural skin texture from the source image, hair line, and any marks.",
    ...characterBlueprintStyleLines(input.style),
    ...(lightGround ? [LIGHT_SHEET_GROUND] : []),
  ];
  if (description) lines.push(`Character: ${description}`);
  if (input.editInstruction && input.parentImageCount) {
    lines.push(
      "Use the first attached image (the current identity portrait) as the base. Apply only the change below; keep the face, skin texture, hair, framing, and visual style otherwise identical.",
      ...(input.photoCount > 0
        ? [
            "Every attached image after the first is an original photo of this character. Keep 五官比例, 整體氣質, and source skin texture anchored to those photos so the face does not drift.",
          ]
        : []),
      `Change: ${input.editInstruction.trim()}`,
    );
    if (input.spec) {
      lines.push(
        "Appearance notes for this character (still true unless the change above says otherwise):",
        characterSpecBlock(input.spec),
      );
    }
    return fitReferencePrompt(lines);
  }
  lines.push(...boardIdentityLines(input));
  if (input.photoCount > 0 && description) {
    lines.push(
      "The Character line may add age, role, or clothing hints; it must not replace the face proportions, skin texture, temperament, or the required style.",
    );
  }
  return fitReferencePrompt(lines);
}

// Full-body standing figure drawn from the finished portrait (first image) plus the photos.
// Cards, pickers, and scene stills use this one; it must be one whole person, nothing else.
export function buildFullBodyPrompt(input: BoardPromptInput) {
  const description = input.description.trim();
  const lightGround = !usesDrawingSurface(input.style);
  const realistic = isRealisticStyle(input.style);
  const lines = [
    "One full-body standing view of the character in the first attached image (their identity portrait) on a tall canvas.",
    "One person, standing straight upright (站直), facing the camera directly front-on (regardless of any seated or angled pose in the reference photo), with a warm, gentle little smile, eyes open, arms relaxed at the sides, feet slightly apart. No props, no text, no labels, no second person, no extra poses.",
    input.photoCount > 0
      ? "Copy the face and skin texture from the portrait. Copy the hair exactly from the original photos — length, colour, parting, and how it is worn — even when the portrait shows a different hairstyle. Complete the outfit, shoes, and accessories from the photos."
      : "Copy the face, hair, and visible clothing from that portrait exactly. Do not restyle the hair.",
    "Framing: the entire body is visible from the top of the hair to the soles of the feet, centered, with empty margin above the head and below the feet. Do not crop to a portrait. Do not draw the figure too small — it should fill about four fifths of the canvas height.",
    ...characterBlueprintStyleLines(input.style),
    lightGround
      ? LIGHT_SHEET_GROUND
      : "The figure stands on the same drawing surface as the portrait.",
    ...(realistic ? [REALISTIC_CHARACTER_RENDER_RULE] : []),
  ];
  if (description) lines.push(`Character: ${description}`);
  if (input.editInstruction && input.parentImageCount && input.parentImageCount > 1) {
    lines.push(
      "The second attached image is the previous full-body figure. Apply only the change below to it; keep pose, framing, skin texture, and everything the change does not name identical, and keep the face on the new portrait.",
      `Change: ${input.editInstruction.trim()}`,
    );
  } else if (input.editInstruction) {
    lines.push(`Change already applied to the portrait, also apply it here: ${input.editInstruction.trim()}`);
  }
  if (input.photoCount > 0) {
    lines.push(
      input.editInstruction
        ? "The remaining attached images are original photos of this character. Keep the face, body proportions, and skin texture faithful to the portrait and source photos, while replacing any hair, top, pants, shoes, or accessories named in Change above."
        : "The remaining attached images are original photos of this character. Use them for body proportions, skin texture, outfit, shoes, and accessories; the face and skin texture stay faithful to the portrait and source photos.",
    );
  }
  if (input.spec) {
    lines.push(
      input.editInstruction
        ? "Appearance notes for this character (still true unless the change above says otherwise):"
        : "Appearance notes for this character:",
      characterSpecBlock(input.spec),
    );
  }
  return fitReferencePrompt(lines);
}

// Full-body standing preview taken from the finished sheet. Cards and pickers show this.
export function buildProfilePrompt(input: { style: RenderableStyle; description: string }) {
  const lightGround = !usesDrawingSurface(input.style);
  const realistic = isRealisticStyle(input.style);
  const description = input.description.trim();
  const lines = [
    "One full-body standing view of the same character as the attached character sheet.",
    "Use only the front view from the sheet. One person, standing straight upright (站直), facing the camera directly front-on, with a warm, gentle little smile, eyes open, arms relaxed at the sides.",
    "Copy face, skin texture, hair, outfit, and rendering from that front view. Do not copy the turnaround, walk cycle, expression grid, labels, or extra poses.",
    "Framing: the entire body is visible, from the top of the hair to the soles of the feet, centered, with empty margin above the head and below the feet. Do not crop to a head-and-shoulders portrait.",
    ...characterBlueprintStyleLines(input.style),
    lightGround
      ? LIGHT_SHEET_GROUND
      : "The figure stands on the same drawing surface as the sheet.",
    ...(realistic ? [REALISTIC_CHARACTER_RENDER_RULE] : []),
  ];
  if (description) lines.push(`Character: ${description}`);
  return fitReferencePrompt(lines);
}
