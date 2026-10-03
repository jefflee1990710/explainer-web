import { ObjectId } from "mongodb";
import { isStyleId } from "@/model/style-id";
import type { UserStyleDoc } from "@/model/user-style";
import type { PublicStyle } from "@/presentation/serialize";

// Picker query: this user's styles, excluding soft-deleted rows.
export function selectableUserStyleFilter(clerkUserId: string) {
  return {
    ownerClerkUserId: clerkUserId,
    deletedAt: { $exists: false },
  };
}

// System catalog id, or a user-style ObjectId. Unknown strings stay rejected.
export function isListedStyleId(styleId: string): boolean {
  if (isStyleId(styleId)) return true;
  return ObjectId.isValid(styleId) && new ObjectId(styleId).toHexString() === styleId;
}

// Custom card. A missing preview uses the template still until this style has its own.
export function toPublicUserStyle(
  doc: UserStyleDoc,
  templatePreviewUrl: string | undefined,
  templateName: string,
): PublicStyle {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    description: doc.description,
    canvasColor: doc.canvasColor,
    previewUrl: doc.previewUrl || templatePreviewUrl,
    isCustom: true,
    baseStyleId: doc.baseStyleId,
    templateName,
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
