import type { Style } from "./catalog";

// Markdown block appended to the director system prompt. It supersedes only
// the rendering rules of SKILL.md's whiteboard "Locked visual world" so one
// skill can drive every style; the character-identity lock and the default
// everyman in that same section still apply.
export function styleBlockForDirector(style: Style) {
  return [
    `## Visual style: ${style.name} (overrides the rendering, palette, lettering and motion rules of the "Locked visual world" section above)`,
    `Canvas: ${style.canvas}.`,
    `Look: ${style.look}.`,
    `Palette: ${style.palette}.`,
    `Typography: ${style.typography}.`,
    `Motion: ${style.motion}.`,
    `Never: ${style.negatives}.`,
    "Write visualWorld and palette in this style. If a cast or character reference is given, characterLock must only say appearance follows the attached blueprint — never invent clothing or hairstyle from this palette. The default everyman applies only when no cast/reference is given. Keep every other rule (hooks, pacing, clip structure, cast lock, narration) unchanged.",
  ].join("\n");
}

// Opening lines of every storyboard-frame / still prompt.
export function styleLinesForFrame(style: Style) {
  return [
    // Skill-neutral wording: the same still prompt serves explainer, story, demo, etc.
    `Single storyboard still for a ${style.name} short video.`,
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
