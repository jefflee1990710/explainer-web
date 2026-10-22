import { isStyleId } from "@/model/style-id";
import type { UserStyleDoc } from "@/model/user-style";
import type { PublicStyle } from "@/presentation/serialize";

export function selectableUserStyleFilter(clerkUserId: string) {
  return {
    ownerClerkUserId: clerkUserId,
    deletedAt: { $exists: false },
  };
}

// Only built-in catalog style IDs are selectable.
export function isListedStyleId(styleId: string): boolean {
  return isStyleId(styleId);
}

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
