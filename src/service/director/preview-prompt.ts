// Shared composition so the nine director cards compare side by side.
export const DIRECTOR_PREVIEW_SCENE =
  "16:9 cinematic still from a short explainer video. One clear hero moment, wide margins, no logos, no watermarks, no UI chrome, no readable paragraph text. Showcase this director format.";

// Gemini image prompt for a system-director card still.
export function directorPreviewPrompt(input: { title: string; visual: string }) {
  return [
    DIRECTOR_PREVIEW_SCENE,
    `Director format: ${input.title}.`,
    `Visual world: ${input.visual}`,
  ].join("\n");
}
