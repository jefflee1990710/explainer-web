import "server-only";
import { ObjectId } from "mongodb";
import { stylesCollection } from "@/dao";
import { userStylesCollection } from "@/dao/user-styles";
import { isStyleId } from "@/model/style-id";
import type { StyleChatItem, StyleDetail } from "@/presentation/components/app/styles/style-detail";
import { styleFromDoc } from "@/service/style/load-style";
import { listPublicStyles } from "@/service/style/list";
import type { Style } from "@/service/style/types";

function letteringFields(style: Partial<Style>) {
  return {
    letteringLayout: style.letteringLayout ?? "",
    letteringLine1: style.letteringLine1 ?? "",
    letteringLine2: style.letteringLine2 ?? "",
    beatTitleLayout: style.beatTitleLayout ?? "",
    reelLayout: style.reelLayout ?? "",
  };
}

function chatItems(
  chat:
    | {
        role: "user" | "assistant";
        content: string;
        imageUrl?: string;
        previewUrl?: string;
        changedPaths?: string[];
        createdAt: Date;
      }[]
    | undefined,
): StyleChatItem[] {
  return (chat ?? []).map((message) => ({
    role: message.role,
    content: message.content,
    imageUrl: message.imageUrl,
    previewUrl: message.previewUrl,
    changedPaths: message.changedPaths,
    createdAt: message.createdAt.toISOString(),
  }));
}

// System catalog id, or this user's non-deleted style. Anything else is missing.
export async function loadStyleForUser(clerkUserId: string, id: string): Promise<StyleDetail | null> {
  if (isStyleId(id)) {
    const doc = await (await stylesCollection()).findOne({ _id: id });
    const style = styleFromDoc(doc);
    if (!style || !doc) return null;
    return {
      id: style.id,
      isCustom: false,
      name: style.name,
      description: style.description,
      canvas: style.canvas,
      canvasColor: style.canvasColor,
      look: style.look,
      palette: style.palette,
      typography: style.typography,
      motion: style.motion,
      negatives: style.negatives,
      ...letteringFields(style),
      previewUrl: doc.previewUrl,
      hasOwnPreview: Boolean(doc.previewUrl),
      previewStatus: "idle",
      updatedAt: doc.updatedAt.toISOString(),
      chat: [],
    };
  }

  if (!ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id) return null;
  const doc = await (await userStylesCollection()).findOne({
    _id: new ObjectId(id),
    ownerClerkUserId: clerkUserId,
    deletedAt: { $exists: false },
  });
  if (!doc) return null;

  const system = await listPublicStyles();
  const template = system.find((style) => style.id === doc.baseStyleId);
  return {
    id: doc._id.toHexString(),
    isCustom: true,
    name: doc.name,
    description: doc.description,
    canvas: doc.canvas,
    canvasColor: doc.canvasColor,
    look: doc.look,
    palette: doc.palette,
    typography: doc.typography,
    motion: doc.motion,
    negatives: doc.negatives,
    letteringLayout: doc.letteringLayout ?? "",
    letteringLine1: doc.letteringLine1 ?? "",
    letteringLine2: doc.letteringLine2 ?? "",
    beatTitleLayout: doc.beatTitleLayout ?? "",
    reelLayout: doc.reelLayout ?? "",
    previewUrl: doc.previewUrl || template?.previewUrl,
    hasOwnPreview: Boolean(doc.previewUrl),
    previewStatus: doc.previewStatus,
    baseStyleId: doc.baseStyleId,
    templateName: template?.name ?? doc.baseStyleId,
    updatedAt: doc.updatedAt.toISOString(),
    chat: chatItems(doc.chat),
  };
}
