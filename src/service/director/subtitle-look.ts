import type { SubtitleLook } from "@/model/project";

// Subtitle appearance only. Where the line sits stays with the director.
export const SUBTITLE_LOOKS = ["handwritten", "clean", "bold"] as const satisfies readonly SubtitleLook[];

export type { SubtitleLook };

export const DEFAULT_SUBTITLE_LOOK: SubtitleLook = "handwritten";

const LOOK_LINE: Record<SubtitleLook, string> = {
  handwritten:
    "Look: dark hand-lettered marker, slightly uneven, large and readable. Not a printed font.",
  clean:
    "Look: dark geometric sans on a short semi-opaque white plate. Not handwriting.",
  bold:
    "Look: extra-bold condensed sans, high contrast, large and readable. Not a thin font and not handwriting.",
};

export function isSubtitleLook(value: string): value is SubtitleLook {
  return (SUBTITLE_LOOKS as readonly string[]).includes(value);
}

export function resolveSubtitleLook(value?: string | null): SubtitleLook {
  return value && isSubtitleLook(value) ? value : DEFAULT_SUBTITLE_LOOK;
}

// One appearance sentence. No safe-zone, percentage, or edge placement.
export function subtitleLookLine(look?: string | null) {
  return LOOK_LINE[resolveSubtitleLook(look)];
}

// Custom text style: the uploaded image is a lettering sample, not a placement guide.
export function textStyleSampleLookLine(imageIndex: number) {
  return `Look: match attached image ${imageIndex}, a lettering sample. Copy its weight, color, texture, and edges only. Do not copy the words in that image.`;
}

export function textStyleSampleHint() {
  return "Look: match the user's lettering sample — weight, color, texture, and edges. Do not copy words from that sample. Placement stays with this director.";
}
