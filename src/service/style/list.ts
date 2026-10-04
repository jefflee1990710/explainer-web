import "server-only";
import { stylesCollection } from "@/dao";
import { userStylesCollection } from "@/dao/user-styles";
import { STYLE_IDS } from "@/model/style-id";
import type { PublicStyle } from "@/presentation/serialize";
import { styleFromDoc } from "@/service/style/load-style";
import { ensureCatalogStyles } from "@/service/style/ensure-catalog-styles";
import { selectableUserStyleFilter, toPublicUserStyle } from "@/service/style/list-selectable";

// STYLE_IDS order; only complete Mongo docs appear in the picker.
export async function listPublicStyles(): Promise<PublicStyle[]> {
  await ensureCatalogStyles();
  const docs = await (await stylesCollection()).find({}).toArray();
  return STYLE_IDS.flatMap((id) => {
    const doc = docs.find((row) => row._id === id);
    const style = styleFromDoc(doc);
    if (!style) return [];
    return [{
      id,
      name: style.name,
      description: style.description,
      canvasColor: style.canvasColor,
      previewUrl: doc?.previewUrl,
      isCustom: false,
    }];
  });
}

// System styles in catalog order, then this user's styles newest edit first.
export async function listSelectableStyles(
  clerkUserId: string,
): Promise<{ system: PublicStyle[]; mine: PublicStyle[] }> {
  const system = await listPublicStyles();
  const docs = await (await userStylesCollection())
    .find(selectableUserStyleFilter(clerkUserId))
    .sort({ updatedAt: -1 })
    .toArray();
  const mine = docs.map((doc) => {
    const template = system.find((style) => style.id === doc.baseStyleId);
    return toPublicUserStyle(doc, template?.previewUrl, template?.name ?? doc.baseStyleId);
  });
  return { system, mine };
}
