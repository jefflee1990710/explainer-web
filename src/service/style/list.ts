import "server-only";
import { stylesCollection } from "@/dao";
import type { PublicStyle } from "@/presentation/serialize";
import { STYLES, STYLE_IDS } from "@/service/style/catalog";
import { styleFromDoc } from "@/service/style/load-style";

// Catalog order; complete Mongo docs win for picker copy.
export async function listPublicStyles(): Promise<PublicStyle[]> {
  const docs = await (await stylesCollection()).find({}).toArray();
  return STYLE_IDS.map((id) => {
    const doc = docs.find((row) => row._id === id);
    const { name, nameZh, description, canvasColor } = styleFromDoc(doc) ?? STYLES[id];
    return {
      id,
      name,
      nameZh,
      description,
      canvasColor,
      previewUrl: doc?.previewUrl,
    };
  });
}
