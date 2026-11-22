// Canvas view presets. Editor is the default: models and tools on the left, no agent chat.
// Agent keeps only the right-hand chat.

export type CanvasViewLayout = "editor" | "agent";

export const CANVAS_VIEW_LAYOUT_KEY = "scro.canvas.viewLayout";

export function canvasViewLayoutFromStorage(stored: string | null): CanvasViewLayout {
  return stored === "agent" ? "agent" : "editor";
}
