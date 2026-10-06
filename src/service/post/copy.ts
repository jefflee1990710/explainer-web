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
export function buildPosterImagePrompt(
  layers: PosterLayer[],
  options: {
    styleName?: string;
    styleLook?: string;
    characterCount?: number;
    productNames?: string[];
  } = {},
) {
  const wording = posterCopyText(layers) || " ";
  const productCount = options.productNames?.length ?? 0;
  const lines = [
    "Scro poster, portrait 2:3, white paper.",
    "Follow the attached layout blueprint: same blocks, lines, curves, and whitespace.",
    "Brand fills: ink #1A1A1A and lime #C6F24B on white. Do not use sage green.",
    `Replace the sample lettering with this wording only: "${wording}".`,
  ];
  if (options.styleName) {
    lines.push(
      `Draw people and the surrounding scene in the ${options.styleName} style.`,
      options.styleLook ? `Look: ${options.styleLook}.` : "",
    );
  }
  if (options.characterCount) {
    lines.push(
      "Character references follow the layout blueprint. Keep their identity and draw them in the chosen style.",
    );
  }
  if (productCount) {
    const start = 2 + (options.characterCount ?? 0);
    lines.push(
      `PRODUCT LOCK: attached image${productCount === 1 ? ` ${start} is` : `s ${start}–${start + productCount - 1} are`} the real product (${options.productNames!.join(", ")}). Keep the product photorealistic and identical to that reference. Do not redraw the product in the poster style.`,
    );
  }
  lines.push("Do not add extra captions or a border.");
  return lines.filter(Boolean).join(" ");
}
