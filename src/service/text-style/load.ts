import { ObjectId } from "mongodb";
import { textStylesCollection } from "@/dao";
import type { TextStyleDoc } from "@/model/text-style";
import { resolveTextStyleLookLine } from "@/service/text-style/look-line";
import type { PublicTextStyleDetail } from "@/presentation/serialize";

export function toPublicTextStyleDetail(doc: TextStyleDoc): PublicTextStyleDetail {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    imageUrl: doc.imageUrl,
    updatedAt: doc.updatedAt.toISOString(),
    baseLookId: doc.baseLookId,
    lookLine: resolveTextStyleLookLine(doc),
    previewStatus: doc.previewStatus || "idle",
    previewHash: doc.previewHash,
    chat: (doc.chat || []).map((message) => ({
      role: message.role,
      content: message.content,
      imageUrl: message.imageUrl,
      previewUrl: message.previewUrl,
      changedPaths: message.changedPaths,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function loadTextStyleForUser(
  clerkUserId: string,
  id: string,
): Promise<PublicTextStyleDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const styles = await textStylesCollection();
  const doc = (await styles.findOne({
    _id: new ObjectId(id),
    clerkUserId,
  })) as TextStyleDoc | null;
  if (!doc) return null;
  return toPublicTextStyleDetail(doc);
}
