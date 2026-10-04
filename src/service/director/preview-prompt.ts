import type { StyleId } from "@/model/style-id";

// One row, left to right: each frame is the next planning beat and a different style.
export const DIRECTOR_PREVIEW_STRIP_IDS: StyleId[] = [
  "doodle",
  "flat-vector",
  "paper-cutout",
  "clay",
  "realistic",
];

// Kept so older imports still name the strip. Not a 3×3.
export const DIRECTOR_PREVIEW_STYLE_IDS: StyleId[] = DIRECTOR_PREVIEW_STRIP_IDS;

const DIRECTOR_PREVIEW_SCENE =
  "16:9 storyboard card. ONE horizontal row of exactly 5 equal frames, read only left to right. Keep each frame's natural proportions — never stretch people or panels taller. No black bars, no letterboxing, no empty margin above or below. Thin even gutters only between frames. Never a 3 by 3 grid, never a second row. No watermarks, no app UI, no paragraph text. Each frame is the next moment in time.";

// Gemini image prompt: a planning timeline, one style per frame.
export function directorPreviewPrompt(input: {
  title: string;
  visual: string;
  plan: string;
  styleNames: string[];
}) {
  const frames = input.styleNames
    .map((name, index) => `${index + 1}. ${name}`)
    .join("; ");
  return [
    DIRECTOR_PREVIEW_SCENE,
    `Director: ${input.title}.`,
    "Left to right is a timeline of how this director plans the storyboard, not five copies of one moment.",
    "Frame 1: the opening hook, the plan just starting.",
    "Frame 2: the first storyboard beat locked in.",
    "Frame 3: the middle of the plan, the idea being built.",
    "Frame 4: the turn, just before the answer.",
    "Frame 5: the resting payoff, planning finished.",
    `How this director plans: ${input.plan}`,
    `What the pictures contain: ${input.visual}`,
    `Styles, one per frame, left to right, never repeated: ${frames}.`,
    "The story advances and the style changes. Do not reuse a style. Do not put two styles in one frame.",
  ].join("\n");
}

export function directorPreviewStyleNames(styles: { id: string; name: string }[]) {
  return DIRECTOR_PREVIEW_STRIP_IDS.map((id) => {
    const style = styles.find((row) => row.id === id);
    if (!style?.name.trim()) {
      throw new Error(`Style "${id}" is missing from Mongo`);
    }
    return style.name;
  });
}
