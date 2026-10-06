import type { SceneTextLanguage } from "@/model/project";
import {
  INSTRUCTION_MAX,
  SLOT_CHAR_LIMITS,
  type PosterLayer,
  type PosterLayout,
  type PosterTextLayer,
  type PosterTextRole,
} from "@/model/post";

export type PostFieldError = "instruction_required" | "instruction_too_long";

// Trim the instruction and reject empty or oversized copy.
export function validatePostInstruction(
  instruction: string,
): { ok: true; instruction: string } | { ok: false; error: PostFieldError } {
  const trimmed = instruction.trim();
  if (!trimmed) return { ok: false, error: "instruction_required" };
  if (trimmed.length > INSTRUCTION_MAX) return { ok: false, error: "instruction_too_long" };
  return { ok: true, instruction: trimmed };
}

export function truncateSlot(role: PosterTextRole, text: string) {
  const limit = SLOT_CHAR_LIMITS[role];
  const trimmed = text.trim();
  return trimmed.length <= limit ? trimmed : trimmed.slice(0, limit);
}

// Copy designer text into this layout. Unknown slot ids are ignored.
export function applyPosterCopy(layout: PosterLayout, raw: Record<string, string>): PosterLayer[] {
  return layout.layers.map((layer) => {
    if (layer.type !== "text") return { ...layer };
    if (!(layer.id in raw)) return { ...layer, text: "" };
    return { ...layer, text: truncateSlot(layer.role, raw[layer.id] ?? "") };
  });
}

// CJK wording uses the Traditional Chinese scene-image route.
export function posterSceneLanguage(text: string): SceneTextLanguage {
  return /[\u3400-\u9FFF]/.test(text) ? "zh-Hant" : "en";
}

export function posterCopyText(layers: PosterLayer[]) {
  return layers
    .filter((layer): layer is PosterTextLayer => layer.type === "text" && Boolean(layer.text.trim()))
    .map((layer) => layer.text.trim())
    .join("\n");
}

// Prompt for the scene-image preview. The blueprint image is the layout reference.
export function buildPosterImagePrompt(layers: PosterLayer[]) {
  const wording = posterCopyText(layers) || " ";
  return [
    "Swiss modernist poster, portrait 2:3.",
    "Follow the attached layout blueprint: same blocks, lines, curves, and whitespace.",
    "Flat sage green #9AAF8A, ink #1A1A1A, white ground.",
    `Replace the sample lettering with this wording only: "${wording}".`,
    "Do not add extra captions, logos, or a border.",
  ].join(" ");
}
