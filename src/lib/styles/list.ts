import "server-only";
import { stylesCollection } from "@/lib/collections";
import type { PublicStyle } from "@/lib/serialize";
import { STYLES, STYLE_IDS } from "./catalog";

// Preserve catalog order while attaching generated previews.
export async function listPublicStyles(): Promise<PublicStyle[]> {
  const docs = await (await stylesCollection()).find({}).toArray();
  return STYLE_IDS.map((id) => {
    const { name, nameZh, description, canvasColor } = STYLES[id];
    return {
      id,
      name,
      nameZh,
      description,
      canvasColor,
      previewUrl: docs.find((doc) => doc._id === id)?.previewUrl,
    };
  });
}
