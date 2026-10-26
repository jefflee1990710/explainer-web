import {
  CHARACTER_WARDROBE_PARTS,
  characterLookOption,
  type CharacterWardrobePart,
} from "@/service/character/character-look";

// Hex overrides per wardrobe part (hair / top / pants / shoes / accessory).
export type CharacterWardrobeColorPicks = Partial<Record<CharacterWardrobePart, string>>;

export const WARDROBE_HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Stable suffix appended to English garment prompts for image models.
export const WARDROBE_COLOR_SUFFIX_RE = /, exact color (#(?:[0-9a-fA-F]{6}))/;

const PART_FALLBACK_HEX: Record<CharacterWardrobePart, string> = {
  hair: "#2C1810",
  top: "#4A5568",
  pants: "#3D4F6F",
  shoes: "#F5F5F5",
  accessory: "#8B7355",
};

const KEYWORD_HEX: ReadonlyArray<[RegExp, string]> = [
 [/\b(?:jet|coal|midnight|ink|onyx|ebony)\s+black\b|\bblack\b/i, "#121212"],
 [/\b(?:off-)?white\b|\bivory\b|\bcream\b|\becru\b|\bpearl\b/i, "#F5F5F0"],
 [/\bnavy\b|\bmidnight navy\b/i, "#1B2B4B"],
 [/\bcharcoal\b|\bslate\b|\bgraphite\b/i, "#3D4451"],
 [/\bbeige\b|\bsand\b|\bcamel\b|\btaupe\b|\boat\b/i, "#C4A882"],
 [/\bolive\b|\bkhaki\b|\bmoss\b/i, "#6B705C"],
 [/\bburgundy\b|\bmaroon\b|\bwine\b|\boxblood\b/i, "#6B1D2A"],
 [/\bred\b|\bscarlet\b|\bcrimson\b|\bcherry\b/i, "#B91C1C"],
 [/\bblue\b|\bindigo\b|\bcobalt\b|\bteal\b|\bturquoise\b|\baqua\b/i, "#2563EB"],
 [/\bgreen\b|\bemerald\b|\bsage\b|\bforest\b/i, "#15803D"],
 [/\bbrown\b|\bespresso\b|\bchocolate\b|\bcognac\b|\bchestnut\b/i, "#5C4033"],
 [/\bgrey\b|\bgray\b|\bsilver\b|\bheather\b/i, "#9CA3AF"],
 [/\bpink\b|\bblush\b|\brose\b|\bmauve\b/i, "#DB7093"],
 [/\byellow\b|\bgold\b|\bchampagne\b|\bmustard\b/i, "#CA8A04"],
 [/\borange\b|\bcoral\b|\bterracotta\b|\brust\b/i, "#EA580C"],
 [/\bpurple\b|\bviolet\b|\blavender\b|\blilac\b/i, "#7C3AED"],
 [/\blight warm skin\b/i, "#E8BEAC"],
 [/\bfair skin\b/i, "#F0D5C4"],
 [/\btortoiseshell\b/i, "#8B4513"],
];

export const RECOMMENDED_WARDROBE_COLORS: Record<CharacterWardrobePart, readonly string[]> = {
  hair: ["#0D0D0D", "#2C1810", "#4A3728", "#6B4423", "#8B6914", "#B8956A", "#D4A574", "#E8D5B7"],
  top: ["#121212", "#F5F5F0", "#1B2B4B", "#B91C1C", "#2563EB", "#15803D", "#CA8A04", "#DB7093"],
  pants: ["#121212", "#3D4F6F", "#6B705C", "#5C4033", "#9CA3AF", "#1B2B4B", "#C4A882", "#F5F5F0"],
  shoes: ["#121212", "#F5F5F5", "#5C4033", "#C4A882", "#1B2B4B", "#B91C1C", "#FFFFFF", "#9CA3AF"],
  accessory: ["#121212", "#C0C0C0", "#FFD700", "#8B7355", "#B91C1C", "#2563EB", "#DB7093", "#F5F5F0"],
};

export function normalizeWardrobeHexColor(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (WARDROBE_HEX_COLOR_RE.test(trimmed)) return trimmed.toUpperCase();
  const bare = trimmed.replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(bare)) return `#${bare.toUpperCase()}`;
  return null;
}

export function inferWardrobeColorFromPrompt(prompt: string): string | null {
  const embedded = prompt.match(/#(?:[0-9a-fA-F]{6})/);
  if (embedded) return normalizeWardrobeHexColor(embedded[0]);
  for (const [pattern, hex] of KEYWORD_HEX) {
    if (pattern.test(prompt)) return hex;
  }
  return null;
}

export function defaultWardrobeColorForOption(
  part: CharacterWardrobePart,
  optionId: string,
  customPrompt?: string,
): string {
  if (part === "accessory" && optionId === "none") return PART_FALLBACK_HEX.accessory;
  if (part === "hair" && optionId === "none") return "#E8BEAC";
  if (part === "shoes" && optionId === "none") return PART_FALLBACK_HEX.shoes;
  const prompt =
    customPrompt ?? characterLookOption(part, optionId)?.prompt ?? "";
  return inferWardrobeColorFromPrompt(prompt) ?? PART_FALLBACK_HEX[part];
}

export function effectiveWardrobeColor(
  part: CharacterWardrobePart,
  optionId: string,
  colors: CharacterWardrobeColorPicks | undefined,
  customPrompt?: string,
): string {
  const override = normalizeWardrobeHexColor(colors?.[part]);
  if (override) return override;
  return defaultWardrobeColorForOption(part, optionId, customPrompt);
}

export function appendWardrobeColorToPrompt(basePrompt: string, hex: string | null | undefined): string {
  const normalized = normalizeWardrobeHexColor(hex);
  if (!normalized) return stripWardrobeColorSuffix(basePrompt);
  const base = stripWardrobeColorSuffix(basePrompt);
  return `${base}, exact color ${normalized}`;
}

export function stripWardrobeColorSuffix(prompt: string): string {
  return prompt.replace(WARDROBE_COLOR_SUFFIX_RE, "");
}

export function wardrobePromptWithColor(
  basePrompt: string,
  part: CharacterWardrobePart,
  optionId: string,
  colors: CharacterWardrobeColorPicks | undefined,
  customPrompt?: string,
): string {
  const hex = effectiveWardrobeColor(part, optionId, colors, customPrompt);
  const defaultHex = defaultWardrobeColorForOption(part, optionId, customPrompt);
  if (hex === defaultHex && !colors?.[part]) {
    return stripWardrobeColorSuffix(basePrompt);
  }
  return appendWardrobeColorToPrompt(basePrompt, hex);
}

export function sanitizeWardrobeColors(raw: unknown): CharacterWardrobeColorPicks {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const colors: CharacterWardrobeColorPicks = {};
  for (const part of CHARACTER_WARDROBE_PARTS) {
    const value = input[part];
    if (typeof value !== "string") continue;
    const normalized = normalizeWardrobeHexColor(value);
    if (normalized) colors[part] = normalized;
  }
  return colors;
}

// Parse the latest explicit hex override per part from version prompt + edit history.
export function detectCharacterWardrobeColors(text?: string): CharacterWardrobeColorPicks {
  if (!text) return {};
  const colors: CharacterWardrobeColorPicks = {};
  const foundAt: Partial<Record<CharacterWardrobePart, number>> = {};
  for (const part of CHARACTER_WARDROBE_PARTS) {
    const label = part === "hair" ? "Hair" : part === "top" ? "Top" : part === "pants" ? "Pants" : part === "shoes" ? "Shoes" : "Accessory";
    const re = new RegExp(`${label}:[^;\\n]*?, exact color (#(?:[0-9a-fA-F]{6}))`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const at = match.index;
      const hex = normalizeWardrobeHexColor(match[1]);
      if (!hex) continue;
      if ((foundAt[part] ?? -1) < at) {
        foundAt[part] = at;
        colors[part] = hex;
      }
    }
  }
  return colors;
}

// Include parts whose color changed even when the catalog id did not.
export function mergeWardrobePicksForColorEdits(
  picks: Partial<Record<CharacterWardrobePart, string>>,
  colors: CharacterWardrobeColorPicks,
  activeIds: Partial<Record<CharacterWardrobePart, string>>,
  customPromptMap?: ReadonlyMap<string, string>,
): Partial<Record<CharacterWardrobePart, string>> {
  const merged = { ...picks };
  for (const part of CHARACTER_WARDROBE_PARTS) {
    const override = normalizeWardrobeHexColor(colors[part]);
    if (!override) continue;
    const id = merged[part] ?? activeIds[part];
    if (!id) continue;
    const defaultHex = defaultWardrobeColorForOption(part, id, customPromptMap?.get(id));
    if (override !== defaultHex || colors[part]) {
      merged[part] = id;
    }
  }
  return merged;
}
