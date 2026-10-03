import "server-only";
import { stylesCollection } from "@/dao";
import { STYLE_IDS } from "@/model/style-id";
import type { PublicStyle } from "@/presentation/serialize";
import { styleFromDoc } from "@/service/style/load-style";

// STYLE_IDS order; only complete Mongo docs appear in the picker.
export async function listPublicStyles(): Promise<PublicStyle[]> {
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
    }];
  });
}
