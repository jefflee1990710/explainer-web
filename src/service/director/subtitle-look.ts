import { SUBTITLE_LOOK_IDS, type SubtitleLook } from "@/model/subtitle-look-id";

// Subtitle appearance only. Where the line sits stays with the director.
export const SUBTITLE_LOOKS = SUBTITLE_LOOK_IDS;

export type { SubtitleLook };

export const DEFAULT_SUBTITLE_LOOK: SubtitleLook = "handwritten";

// Library order: the original three, then the later system looks.
export const SYSTEM_TEXT_STYLE_ORDER = [
  "bold",
  "clean",
  "handwritten",
  "neon",
  "comic",
  "chalk",
  "gold",
  "typewriter",
  "graffiti",
  "sticker",
  "glitch",
  "brush",
  "outline",
] as const satisfies readonly SubtitleLook[];

// Each line describes the lettering in that preview. No placement.
const LOOK_LINE: Record<SubtitleLook, string> = {
  bold:
    "Look: extra-bold condensed sans, all caps, white, with a scratched worn print. A short phrase may sit in black on a thick yellow dry-brush stroke. Not handwriting and not a thin font.",
  clean:
    "Look: bold condensed sans on torn-paper strips. One strip is black with white type, another is bright green with black type. Edges are rough and ripped. Not handwriting.",
  handwritten:
    "Look: thick black marker handwriting on a torn white paper strip, slightly uneven, mixed case, large and readable. Not a printed font.",
  neon:
    "Look: neon glass tubing letters, cyan with a soft magenta halo, one connected phrase, bright on a flat near-black field. Not a printed font and not handwriting.",
  comic:
    "Look: comic-book display letters, bright yellow fill, heavy black outline, slight forward slant, small halftone dots in the fill. Not handwriting and not a thin font.",
  chalk:
    "Look: dusty white chalk handwriting, broken powdery strokes, on a flat dark green board. Not a printed font and not marker on paper.",
  gold:
    "Look: high-contrast serif letters in metallic gold foil, slight emboss, on a flat deep black field. Not handwriting and not a sans-serif.",
  typewriter:
    "Look: monospaced typewriter letters, slightly uneven black ink stamp, on a flat warm cream paper field. Not handwriting and not a bold display font.",
  graffiti:
    "Look: spray-paint bubble letters, hot pink fill, black outline, a few paint drips, on a flat concrete-gray field. Not a printed font and not marker on paper.",
  sticker:
    "Look: bold rounded sans letters in bright red, on a white die-cut sticker with a soft gray drop shadow, over a flat pale blue field. Not handwriting.",
  glitch:
    "Look: blocky monospace letters, white, with a red and cyan channel split and a few missing pixel chunks, on a flat black field. Not handwriting.",
  brush:
    "Look: wet black calligraphy brush, thick-to-thin strokes, one ink phrase, on a flat warm off-white field. Not a marker, not a printed font, and not torn paper.",
  outline:
    "Look: hollow varsity block letters, thick navy stroke, empty white interior, slight italic, on a flat light gray field. Not a filled font and not handwriting.",
};

// Filenames are content hashes so a new still does not reuse a cached URL.
const PREVIEW: Record<SubtitleLook, string> = {
  bold: "/text-styles/impact-c28c94b1a6.png",
  clean: "/text-styles/torn-paper-bbf030af28.png",
  handwritten: "/text-styles/marker-cc56a090df.png",
  neon: "/text-styles/neon-6de201104f.png",
  comic: "/text-styles/comic-14e1ee5d58.png",
  chalk: "/text-styles/chalk-0d36d8268c.png",
  gold: "/text-styles/gold-e7c937b3b6.png",
  typewriter: "/text-styles/typewriter-198989a1de.png",
  graffiti: "/text-styles/graffiti-e98cd28e26.png",
  sticker: "/text-styles/sticker-54e16b25ef.png",
  glitch: "/text-styles/glitch-2ed9e87f82.png",
  brush: "/text-styles/brush-4ebc9cda38.png",
  outline: "/text-styles/outline-8676eaac5f.png",
};

export function systemTextStylePreview(look: SubtitleLook) {
  return PREVIEW[look];
}

// Same sample on every card, the way style previews all read IDEA.
export const TEXT_STYLE_PREVIEW_SAMPLE = "Try it now";

// Preview-card composition only. Scene stills use subtitleLookLine, not these notes.
const PREVIEW_NOTE: Partial<Record<SubtitleLook, string>> = {
  clean: "Put Try it on the black strip and now on the green strip.",
  bold: "Put now on the yellow brush stroke.",
  neon: "One horizontal line of tubing. Flat near-black field only.",
  comic: "One line. Flat white field only.",
  chalk: "One line. Flat dark green field only, no frame and no classroom.",
  gold: "One line. Flat black field only.",
  typewriter: "One line. Flat cream paper field only, no machine.",
  graffiti: "One line. Flat gray field only, no street and no wall in perspective.",
  sticker: "The words sit on one white sticker. Flat pale blue field only.",
  glitch: "One line. Flat black field only.",
  brush: "One brush-written line. Flat off-white field only.",
  outline: "One line. Flat light gray field only.",
};

// Lettering sample only. The guideline describes the look; the sample words stay fixed.
export function textStylePreviewPrompt(look?: string | null) {
  const resolved = resolveSubtitleLook(look);
  const lines = [
    "16:9 lettering sample card. Show only the subtitle lettering, large and readable. No people, no scene, no logo, no extra writing.",
    subtitleLookLine(resolved),
    `The only words are: ${TEXT_STYLE_PREVIEW_SAMPLE}`,
  ];
  const note = PREVIEW_NOTE[resolved];
  if (note) lines.push(note);
  lines.push("Aspect ratio 16:9.");
  return lines.join("\n");
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
