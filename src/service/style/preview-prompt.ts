import { LETTERING_KEYS, resolveStyleLettering, type StyleLettering } from "@/service/style/lettering";
import { styleLetteringLine, styleLinesForFrame, type StylePromptSlice } from "@/service/style/prompts";
import { STYLE_PREVIEW_SCENE } from "@/service/style/preview-scene";

export type StylePreviewInput = StylePromptSlice & StyleLettering;

// Saved look, shared IDEA scene, lettering, and a fixed 16:9 frame.
export function stylePreviewPrompt(style: StylePreviewInput): string {
  const lettering = resolveStyleLettering(style);
  const letteringLines = LETTERING_KEYS.map((key) => lettering[key]).filter((line) => line.length > 0);
  return [
    ...styleLinesForFrame(style),
    STYLE_PREVIEW_SCENE,
    styleLetteringLine(style),
    ...letteringLines,
    "The label must read exactly IDEA.",
    "Aspect ratio 16:9.",
  ].join("\n");
}

// True when the stored still was generated from this exact prompt.
export function previewIsCurrent(storedHash: string | undefined, draftHash: string | undefined) {
  return Boolean(storedHash && draftHash && storedHash === draftHash);
}
