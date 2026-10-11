"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateText, Output } from "ai";
import { z } from "zod";
import { textStylesCollection } from "@/dao";
import type { TextStyleChatMessage, TextStyleDoc } from "@/model/text-style";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { chatRateLimited } from "@/service/director/chat-rate-limit";
import { normalizeChatSummary } from "@/service/director/director-chat-prompt";
import { directorModel } from "@/service/director/model";
import {
  isSubtitleLook,
  systemTextStylePreview,
} from "@/service/director/subtitle-look";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  DEFAULT_UPLOAD_LOOK_LINE,
  LOOK_LINE_MAX,
  lookLineFromSystemLook,
  parseLookLine,
  resolveTextStyleLookLine,
} from "@/service/text-style/look-line";
import {
  textStyleChatSystemPrompt,
  textStyleChatUserPrompt,
} from "@/service/text-style/chat-prompt";
import { brandAssetPath, checkBrandUpload } from "@/service/video-edit/edit-state";

const NAME_MAX = 40;
const STYLE_MAX = 40;
const MESSAGE_MAX = 2000;
const HISTORY_SENT = 20;
const CHAT_KEPT = 100;

type Fail = { ok: false; error: string };
export type TextStyleResult = { ok: true } | Fail;
export type CreateTextStyleResult = { ok: true; id: string } | Fail;
export type SaveTextStyleResult = { ok: true } | Fail;
export type TextStyleChatResult =
  | {
      ok: true;
      summary: string;
      lookLine: string;
      createdAt: string;
      previewUrl?: string;
    }
  | Fail;

function fail(error: unknown, fallback: string): Fail {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function readName(raw: string): { ok: true; name: string } | Fail {
  const name = raw.trim();
  if (!name) return { ok: false, error: "請輸入名稱" };
  if (name.length > NAME_MAX) return { ok: false, error: `名稱最多 ${NAME_MAX} 字` };
  return { ok: true, name };
}

async function readImage(formData: FormData, clerkUserId: string) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "請上傳一張字體圖" };
  const checked = checkBrandUpload(file);
  if (!checked.ok) return checked;
  if (checked.kind !== "image") return { ok: false as const, error: "只支援 PNG、JPG、WebP" };
  const url = await persistBuffer(
    Buffer.from(await file.arrayBuffer()),
    brandAssetPath(clerkUserId, randomUUID(), checked.ext),
    file.type,
  );
  return { ok: true as const, url };
}

async function ownedTextStyle(id: string, clerkUserId: string): Promise<TextStyleDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const styles = await textStylesCollection();
  return styles.findOne({ _id: new ObjectId(id), clerkUserId }) as Promise<TextStyleDoc | null>;
}

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

// Copy a system preview PNG from /public into the user's blob store.
export async function copySystemTextStylePreview(look: string, clerkUserId: string) {
  if (!isSubtitleLook(look)) throw new Error("找不到模板");
  const relative = systemTextStylePreview(look).replace(/^\//, "");
  const buffer = await readFile(path.join(process.cwd(), "public", relative));
  return persistBuffer(buffer, brandAssetPath(clerkUserId, randomUUID(), "png"), "image/png");
}

/** Builds the insert document for a fork from a system look. */
export function buildTextStyleFromLook(input: {
  clerkUserId: string;
  baseLookId: string;
  name: string;
  imageUrl: string;
  now: Date;
}): TextStyleDoc {
  if (!isSubtitleLook(input.baseLookId)) throw new Error("找不到模板");
  return {
    _id: new ObjectId(),
    clerkUserId: input.clerkUserId,
    name: input.name.trim(),
    imageUrl: input.imageUrl,
    baseLookId: input.baseLookId,
    lookLine: lookLineFromSystemLook(input.baseLookId),
    chat: [],
    previewStatus: "idle",
    createdAt: input.now,
    updatedAt: input.now,
  };
}

// Upload a lettering sample and save it as this user's text style.
export async function createTextStyleAction(formData: FormData): Promise<CreateTextStyleResult> {
  const user = await requireAppUser();
  const named = readName(String(formData.get("name") || ""));
  if (!named.ok) return named;
  const image = await readImage(formData, user.clerkUserId);
  if (!image.ok) return image;
  const styles = await textStylesCollection();
  const count = await styles.countDocuments({ clerkUserId: user.clerkUserId });
  if (count >= STYLE_MAX) return { ok: false, error: `最多 ${STYLE_MAX} 個文字樣式` };
  const now = new Date();
  const id = new ObjectId();
  await styles.insertOne({
    _id: id,
    clerkUserId: user.clerkUserId,
    name: named.name,
    imageUrl: image.url,
    lookLine: DEFAULT_UPLOAD_LOOK_LINE,
    chat: [],
    previewStatus: "idle",
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/app/text-styles");
  return { ok: true, id: id.toHexString() };
}

// Fork a system subtitle look into a user-owned text style.
export async function createTextStyleFromLookAction(input: {
  baseLookId: string;
  name: string;
}): Promise<CreateTextStyleResult> {
  try {
    const user = await requireAppUser();
    const named = readName(String(input?.name ?? ""));
    if (!named.ok) return named;
    const baseLookId = String(input?.baseLookId ?? "");
    if (!isSubtitleLook(baseLookId)) return { ok: false, error: "找不到模板" };

    const styles = await textStylesCollection();
    const count = await styles.countDocuments({ clerkUserId: user.clerkUserId });
    if (count >= STYLE_MAX) return { ok: false, error: `最多 ${STYLE_MAX} 個文字樣式` };

    const imageUrl = await copySystemTextStylePreview(baseLookId, user.clerkUserId);
    const doc = buildTextStyleFromLook({
      clerkUserId: user.clerkUserId,
      baseLookId,
      name: named.name,
      imageUrl,
      now: new Date(),
    });
    await styles.insertOne(doc);
    revalidatePath("/app/text-styles");
    return { ok: true, id: doc._id.toHexString() };
  } catch (error) {
    return fail(error, "建立文字樣式失敗");
  }
}

// Save name + lookLine on a user-owned text style.
export async function saveTextStyleAction(input: {
  id: string;
  name: string;
  lookLine: string;
}): Promise<SaveTextStyleResult> {
  try {
    const user = await requireAppUser();
    const doc = await ownedTextStyle(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到文字樣式" };
    const named = readName(String(input?.name ?? ""));
    if (!named.ok) return named;
    const look = parseLookLine(input?.lookLine);
    if (!look.ok) return look;

    const styles = await textStylesCollection();
    const updated = await styles.updateOne(
      { _id: doc._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          name: named.name,
          lookLine: look.lookLine,
          updatedAt: new Date(),
        },
      },
    );
    if (updated.matchedCount !== 1) return { ok: false, error: "找不到文字樣式" };
    revalidatePath("/app/text-styles");
    revalidatePath(`/app/text-styles/${doc._id.toHexString()}`);
    return { ok: true };
  } catch (error) {
    return fail(error, "儲存文字樣式失敗");
  }
}

// Replace the lettering sample. Videos pick up the new image the next time the brief is saved.
export async function replaceTextStyleImageAction(id: string, formData: FormData): Promise<TextStyleResult> {
  const user = await requireAppUser();
  if (!ObjectId.isValid(id)) return { ok: false, error: "找不到文字樣式" };
  const image = await readImage(formData, user.clerkUserId);
  if (!image.ok) return image;
  const styles = await textStylesCollection();
  const updated = await styles.updateOne(
    { _id: new ObjectId(id), clerkUserId: user.clerkUserId },
    { $set: { imageUrl: image.url, updatedAt: new Date() } },
  );
  if (!updated.matchedCount) return { ok: false, error: "找不到文字樣式" };
  revalidatePath("/app/text-styles");
  revalidatePath(`/app/text-styles/${id}`);
  return { ok: true };
}

export async function deleteTextStyleAction(id: string): Promise<TextStyleResult> {
  const user = await requireAppUser();
  if (!ObjectId.isValid(id)) return { ok: false, error: "找不到文字樣式" };
  const styles = await textStylesCollection();
  const removed = await styles.deleteOne({ _id: new ObjectId(id), clerkUserId: user.clerkUserId });
  if (!removed.deletedCount) return { ok: false, error: "找不到文字樣式" };
  revalidatePath("/app/text-styles");
  return { ok: true };
}

// Ask the AI to edit the lookLine draft; persists chat only, never the draft fields.
export async function sendTextStyleChatAction(input: {
  id: string;
  message: string;
  imageUrl?: string;
  lookLine: string;
}): Promise<TextStyleChatResult> {
  try {
    const user = await requireAppUser();
    const doc = await ownedTextStyle(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到文字樣式" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能使用 AI 修改" };

    const message = String(input.message ?? "").trim();
    const imageUrl = parseChatImageUrl(input.imageUrl);
    if (message.length > MESSAGE_MAX) return { ok: false, error: "訊息過長" };
    if (!message && !imageUrl) return { ok: false, error: "請輸入訊息" };
    const promptMessage = message || "Match the attached reference image.";

    const look = parseLookLine(input?.lookLine ?? resolveTextStyleLookLine(doc));
    if (!look.ok) return look;

    if (chatRateLimited(doc.chat, new Date())) return { ok: false, error: "AI 修改太頻繁，請稍後再試" };

    const promptText = textStyleChatUserPrompt({
      lookLine: look.lookLine,
      history: (doc.chat || []).slice(-HISTORY_SENT),
      message: promptMessage,
      hasImage: Boolean(imageUrl),
    });

    let imageParts: Awaited<ReturnType<typeof loadDirectorImageParts>> = [];
    if (imageUrl) {
      try {
        imageParts = await loadDirectorImageParts([imageUrl]);
      } catch (error) {
        console.error("text style chat image fetch failed", error);
        return { ok: false, error: "素材網址無效，請重新上傳" };
      }
    }

    const schema = z.object({
      summary: z.string(),
      lookLine: z.string(),
    });

    let output: z.infer<typeof schema>;
    try {
      ({ output } = await generateText({
        model: directorModel(),
        output: Output.object({ schema }),
        system: textStyleChatSystemPrompt(),
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
      console.error("text style chat failed", error);
      return { ok: false, error: "AI 修改失敗，請再試一次" };
    }

    const nextLook = String(output.lookLine ?? "").trim();
    if (!nextLook) return { ok: false, error: "AI 沒有修改任何欄位" };
    if (nextLook.length > LOOK_LINE_MAX) return { ok: false, error: `字體描述最多 ${LOOK_LINE_MAX} 字` };

    const now = new Date();
    const userMsg: TextStyleChatMessage = {
      role: "user",
      content: message,
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: now,
    };
    const assistantMsg: TextStyleChatMessage = {
      role: "assistant",
      content: normalizeChatSummary(output.summary, nextLook === look.lookLine ? 0 : 1),
      changedPaths: nextLook === look.lookLine ? [] : ["lookLine"],
      createdAt: now,
    };

    const styles = await textStylesCollection();
    const pushed = await styles.updateOne(
      { _id: doc._id, clerkUserId: user.clerkUserId },
      { $push: { chat: { $each: [userMsg, assistantMsg], $slice: -CHAT_KEPT } } },
    );
    if (pushed.matchedCount !== 1) return { ok: false, error: "找不到文字樣式" };

    return {
      ok: true,
      summary: assistantMsg.content,
      lookLine: nextLook,
      createdAt: now.toISOString(),
      previewUrl: assistantMsg.previewUrl,
    };
  } catch (error) {
    return fail(error, "AI 修改失敗，請再試一次");
  }
}

export type { GenerateTextStylePreviewResult } from "@/service/text-style/preview";
export { generateTextStylePreviewAction } from "@/service/text-style/preview";
