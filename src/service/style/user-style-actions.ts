import { ObjectId } from "mongodb";
import { generateText, Output } from "ai";
import { z } from "zod";
import { stylesCollection } from "@/dao";
import { userStylesCollection } from "@/dao/user-styles";
import { isStyleId, type StyleId } from "@/model/style-id";
import type { StyleChatMessage, UserStyleDoc } from "@/model/user-style";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { chatRateLimited } from "@/service/director/chat-rate-limit";
import { directorModel } from "@/service/director/model";
import { normalizeChatSummary } from "@/service/director/director-chat-prompt";
import { styleFromDoc } from "@/service/style/load-style";
import {
  copyUserStyleFields,
  parseUserStyleFields,
  parseUserStyleMeta,
  type UserStyleFields,
  type UserStyleVisualKey,
} from "@/service/style/user-style-fields";
import {
  userStyleChatSystemPrompt,
  userStyleChatUserPrompt,
} from "@/service/style/user-style-chat-prompt";
import { applyUserStyleEdits } from "@/service/style/user-style-edits";
import type { Style } from "@/service/style/types";

const MESSAGE_MAX = 2000;
const HISTORY_SENT = 20;
const CHAT_KEPT = 100;

const userStyleChatSchema = z.object({
  summary: z.string(),
  edits: z.array(z.object({ field: z.string(), content: z.string() })),
});

export type CreateUserStyleResult = { ok: true; id: string } | { ok: false; error: string };
export type SaveUserStyleResult = { ok: true } | { ok: false; error: string };
export type DeleteUserStyleResult = { ok: true } | { ok: false; error: string };
export type UserStyleChatResult =
  | {
      ok: true;
      summary: string;
      fields: UserStyleFields;
      changedFields: UserStyleVisualKey[];
      createdAt: string;
      previewUrl?: string;
    }
  | { ok: false; error: string };

export type { GenerateUserStylePreviewResult } from "@/service/style/user-style-preview";
export { generateUserStylePreviewAction } from "@/service/style/user-style-preview";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

/** Builds a new user-owned style document from a system template snapshot. */
export function buildUserStyleInsert(input: {
  ownerClerkUserId: string;
  baseStyleId: StyleId;
  name: string;
  description: string;
  template: Style;
  now: Date;
}): UserStyleDoc {
  const _id = new ObjectId();
  const fields = copyUserStyleFields(input.template);
  return {
    _id,
    ownerClerkUserId: input.ownerClerkUserId,
    baseStyleId: input.baseStyleId,
    ...fields,
    name: input.name.trim(),
    description: input.description.trim(),
    previewStatus: "idle",
    chat: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
}

// Active custom style owned by this user, or null for invalid / missing / not-owned / deleted ids.
async function ownedUserStyle(id: string, clerkUserId: string): Promise<UserStyleDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const collection = await userStylesCollection();
  return collection.findOne({
    _id: new ObjectId(id),
    ownerClerkUserId: clerkUserId,
    deletedAt: { $exists: false },
  });
}

// Fork a system style into a new user-owned copy; never writes to `styles`.
export async function createUserStyleAction(input: {
  baseStyleId: string;
  name: string;
  description: string;
}): Promise<CreateUserStyleResult> {
  try {
    const user = await requireAppUser();
    const meta = parseUserStyleMeta(String(input?.name ?? ""), String(input?.description ?? ""));
    if (!meta.ok) return meta;

    const baseStyleId = String(input?.baseStyleId ?? "");
    if (!isStyleId(baseStyleId)) return { ok: false, error: "找不到模板" };

    const styles = await stylesCollection();
    const templateDoc = await styles.findOne({ _id: baseStyleId });
    const template = styleFromDoc(templateDoc);
    if (!template) return { ok: false, error: "找不到模板" };

    const now = new Date();
    const doc = buildUserStyleInsert({
      ownerClerkUserId: user.clerkUserId,
      baseStyleId,
      name: meta.name,
      description: meta.description,
      template,
      now,
    });
    const collection = await userStylesCollection();
    await collection.insertOne(doc);

    return { ok: true, id: doc._id.toHexString() };
  } catch (error) {
    return fail(error, "建立 Style 失敗");
  }
}

// Save name, description, and visual fields on a user-owned style.
export async function saveUserStyleAction(input: {
  id: string;
  name: string;
  description: string;
  fields: unknown;
}): Promise<SaveUserStyleResult> {
  try {
    const user = await requireAppUser();
    const doc = await ownedUserStyle(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到 Style" };

    const meta = parseUserStyleMeta(String(input?.name ?? ""), String(input?.description ?? ""));
    if (!meta.ok) return meta;
    const parsed = parseUserStyleFields(input.fields);
    if (!parsed.ok) return parsed;

    const collection = await userStylesCollection();
    const updated = await collection.updateOne(
      { _id: doc._id, ownerClerkUserId: user.clerkUserId, deletedAt: { $exists: false } },
      {
        $set: {
          ...parsed.fields,
          name: meta.name,
          description: meta.description,
          updatedAt: new Date(),
        },
      },
    );
    if (updated.matchedCount !== 1) return { ok: false, error: "找不到 Style" };

    return { ok: true };
  } catch (error) {
    return fail(error, "儲存 Style 失敗");
  }
}

// Soft-delete a user-owned style; generation jobs may still reference it.
export async function deleteUserStyleAction(input: { id: string }): Promise<DeleteUserStyleResult> {
  try {
    const user = await requireAppUser();
    const id = String(input?.id ?? "");
    if (!ObjectId.isValid(id)) return { ok: false, error: "找不到 Style" };

    const collection = await userStylesCollection();
    const now = new Date();
    const removed = await collection.updateOne(
      { _id: new ObjectId(id), ownerClerkUserId: user.clerkUserId, deletedAt: { $exists: false } },
      { $set: { deletedAt: now, updatedAt: now } },
    );
    if (removed.matchedCount !== 1) return { ok: false, error: "找不到 Style" };

    return { ok: true };
  } catch (error) {
    return fail(error, "刪除 Style 失敗");
  }
}

// Ask the AI to edit the current visual draft; persists chat only, never the draft fields.
function parseChatImageUrl(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export async function sendUserStyleChatAction(input: {
  id: string;
  message: string;
  imageUrl?: string;
  draft: unknown;
}): Promise<UserStyleChatResult> {
  try {
    const user = await requireAppUser();
    const doc = await ownedUserStyle(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到 Style" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能使用 AI 修改" };

    const message = String(input.message ?? "").trim();
    const imageUrl = parseChatImageUrl(input.imageUrl);
    if (message.length > MESSAGE_MAX) return { ok: false, error: "訊息過長" };
    if (!message && !imageUrl) return { ok: false, error: "請輸入訊息" };
    const promptMessage = message || "Match the attached reference image.";

    const parsed = parseUserStyleFields(input?.draft);
    if (!parsed.ok) return parsed;
    const fields = parsed.fields;

    if (chatRateLimited(doc.chat, new Date())) return { ok: false, error: "AI 修改太頻繁，請稍後再試" };

    const promptText = userStyleChatUserPrompt({
      fields,
      history: (doc.chat || []).slice(-HISTORY_SENT),
      message: promptMessage,
      hasImage: Boolean(imageUrl),
    });

    let imageParts: Awaited<ReturnType<typeof loadDirectorImageParts>> = [];
    if (imageUrl) {
      try {
        imageParts = await loadDirectorImageParts([imageUrl]);
      } catch (error) {
        console.error("style chat image fetch failed", error);
        return { ok: false, error: "素材網址無效，請重新上傳" };
      }
    }

    let output: z.infer<typeof userStyleChatSchema>;
    try {
      ({ output } = await generateText({
        model: directorModel(),
        output: Output.object({ schema: userStyleChatSchema }),
        system: userStyleChatSystemPrompt(),
        ...(imageParts.length
          ? {
              messages: [
                {
                  role: "user" as const,
                  content: [{ type: "text" as const, text: promptText }, ...imageParts],
                },
              ],
            }
          : { prompt: promptText }),
      }));
    } catch (error) {
      console.error("user style chat failed", error);
      return { ok: false, error: "AI 修改失敗，請再試一次" };
    }

    const applied = applyUserStyleEdits(fields, output.edits);
    if (!applied.ok) return applied;

    const now = new Date();
    const userMsg: StyleChatMessage = {
      role: "user",
      content: message,
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: now,
    };
    const assistantMsg: StyleChatMessage = {
      role: "assistant",
      content: normalizeChatSummary(output.summary, applied.changedFields.length),
      changedPaths: applied.changedFields,
      createdAt: now,
    };

    const collection = await userStylesCollection();
    const pushed = await collection.updateOne(
      { _id: doc._id, ownerClerkUserId: user.clerkUserId, deletedAt: { $exists: false } },
      { $push: { chat: { $each: [userMsg, assistantMsg], $slice: -CHAT_KEPT } } },
    );
    if (pushed.matchedCount !== 1) return { ok: false, error: "找不到 Style" };

    return {
      ok: true,
      summary: assistantMsg.content,
      fields: applied.fields,
      changedFields: applied.changedFields,
      createdAt: now.toISOString(),
      previewUrl: assistantMsg.previewUrl,
    };
  } catch (error) {
    return fail(error, "AI 修改失敗，請再試一次");
  }
}
