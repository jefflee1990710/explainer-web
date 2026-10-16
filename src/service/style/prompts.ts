import type { Style } from "@/service/style/types";

export type StylePromptSlice = Pick<
  Style,
  "name" | "canvas" | "look" | "palette" | "typography" | "motion" | "negatives"
>;

// Clauses that tell the image or video model what words to paint. The director owns that.
const ON_SCREEN_TEXT =
  /typography|lettering|captions?|subtitles?|on-canvas|on canvas|\bfonts?\b|\btexts?\b|\bletters?\b|\bwords?\b|headlines?|\btitles?\b|\blabels?\b|signage|watermark|字幕|字體|字体|標題|标题|手寫字|手写字|印刷/i;

/** Drop style clauses that tell a still or a clip what text to draw. */
export function withoutOnScreenTextInstructions(value: string) {
  return value
    .split(/(?<=[.;。])\s+|,\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !ON_SCREEN_TEXT.test(part))
    .join(", ");
}

function visualLine(label: string, value: string) {
  const text = withoutOnScreenTextInstructions(value);
  return text ? `${label}: ${text}.` : "";
}

// Picture only. Storyboard, cast, objects, and on-screen text stay with the director.
export function styleBlockForDirector(style: StylePromptSlice & { id?: string }) {
  return [
    `## Visual style: ${style.name}`,
    "These lines replace only how the picture is drawn and how it moves (superseding any default whiteboard or flat medium rules in the skill above).",
    visualLine("Canvas", style.canvas),
    visualLine("Look", style.look),
    visualLine("Palette", style.palette),
    visualLine("Motion", style.motion),
    visualLine("Never", style.negatives),
  ]
    .filter(Boolean)
    .join("\n");
}

// Opening lines of every storyboard-frame / still prompt.
export function styleLinesForFrame(style: StylePromptSlice & { id?: string }) {
  return [
    `Single storyboard still for a ${style.name} short video.`,
    [
      visualLine("Canvas", style.canvas),
      visualLine("Look", style.look),
      visualLine("Palette", style.palette),
      visualLine("Never", style.negatives),
    ]
      .filter(Boolean)
      .join(" "),
  ];
}

// Style-preview lettering only. Scene stills and clip videos do not use this.
export function styleLetteringLine(style: StylePromptSlice) {
  return `Lettering: ${style.typography}.`;
}

// Character model-sheet rendering rules; the layout lines stay in blueprint-prompt.ts.
export function styleLinesForBlueprint(style: StylePromptSlice) {
  return [
    `Background: ${style.canvas}.`,
    `Rendering: ${style.look}.`,
    `Palette: ${style.palette}.`,
    `Never: ${style.negatives}.`,
  ];
}
