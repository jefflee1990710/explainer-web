import type { SubtitleLook } from "@/model/project";

// Subtitle appearance only. Where the line sits stays with the director.
export const SUBTITLE_LOOKS = ["handwritten", "clean", "bold"] as const satisfies readonly SubtitleLook[];

export type { SubtitleLook };

export const DEFAULT_SUBTITLE_LOOK: SubtitleLook = "handwritten";

// Library order matches the three reference stills: impact, torn paper, marker.
export const SYSTEM_TEXT_STYLE_ORDER = ["bold", "clean", "handwritten"] as const satisfies readonly SubtitleLook[];

// Each line describes the lettering in that preview. No placement.
const LOOK_LINE: Record<SubtitleLook, string> = {
  bold:
    "Look: extra-bold condensed sans, all caps, white, with a scratched worn print. A short phrase may sit in black on a thick yellow dry-brush stroke. Not handwriting and not a thin font.",
  clean:
    "Look: bold condensed sans on torn-paper strips. One strip is black with white type, another is bright green with black type. Edges are rough and ripped. Not handwriting.",
  handwritten:
    "Look: thick black marker handwriting on a torn white paper strip, slightly uneven, mixed case, large and readable. Not a printed font.",
};

const PREVIEW: Record<SubtitleLook, string> = {
  bold: "/text-styles/impact.png",
  clean: "/text-styles/torn-paper.png",
  handwritten: "/text-styles/marker.png",
};

export function systemTextStylePreview(look: SubtitleLook) {
  return PREVIEW[look];
}

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
