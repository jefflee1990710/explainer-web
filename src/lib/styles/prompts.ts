import type { Style } from "./catalog";

// Markdown block appended to the director system prompt. It explicitly
// supersedes SKILL.md's whiteboard "Locked visual world" so one skill can
// drive every style.
export function styleBlockForDirector(style: Style) {
  return [
    `## Visual style: ${style.name} (overrides the "Locked visual world" section above)`,
    `Canvas: ${style.canvas}.`,
    `Look: ${style.look}.`,
    `Palette: ${style.palette}.`,
    `Typography: ${style.typography}.`,
    `Motion: ${style.motion}.`,
    `Never: ${style.negatives}.`,
    "Write visualWorld, palette and characterLock in this style. Keep every other rule (hooks, pacing, clip structure, cast lock, narration) unchanged.",
  ].join("\n");
}

// Opening lines of every storyboard-frame / still prompt.
export function styleLinesForFrame(style: Style) {
  return [
    `Single storyboard still for a ${style.name} explainer video.`,
    `Canvas: ${style.canvas}. Look: ${style.look}. Never: ${style.negatives}. No watermark.`,
  ];
}

// Placed next to the spelling rule so lettering and spelling travel together.
export function styleLetteringLine(style: Style) {
  return `Lettering: ${style.typography}.`;
}

// Character model-sheet rendering rules; the layout lines stay in blueprint-prompt.ts.
export function styleLinesForBlueprint(style: Style) {
  return [
    `Background: ${style.canvas}.`,
    `Rendering: ${style.look}.`,
    `Palette: ${style.palette}.`,
    `Never: ${style.negatives}.`,
  ];
}
