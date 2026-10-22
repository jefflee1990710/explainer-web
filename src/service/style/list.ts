import type { PublicStyle } from "@/presentation/serialize";
import { STYLES } from "@/service/style/catalog";

// Hardcoded catalog styles in STYLE_IDS order.
export async function listPublicStyles(): Promise<PublicStyle[]> {
  return STYLES.map((style) => ({
    id: style.id,
    name: style.name,
    description: style.description,
    canvasColor: style.canvasColor,
    previewUrl: style.previewUrl,
    isCustom: false,
  }));
}

// Custom styles are removed; `mine` is always empty.
export async function listSelectableStyles(
  _clerkUserId?: string,
): Promise<{ system: PublicStyle[]; mine: PublicStyle[] }> {
  const system = await listPublicStyles();
  return { system, mine: [] };
}
