"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { textStylesCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import { persistBuffer } from "@/service/higgsfield/persist";
import { brandAssetPath, checkBrandUpload } from "@/service/video-edit/edit-state";

const NAME_MAX = 40;
const STYLE_MAX = 40;

type Fail = { ok: false; error: string };
export type TextStyleResult = { ok: true } | Fail;

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

// Upload a lettering sample and save it as this user's text style.
export async function createTextStyleAction(formData: FormData): Promise<TextStyleResult> {
  const user = await requireAppUser();
  const named = readName(String(formData.get("name") || ""));
  if (!named.ok) return named;
  const image = await readImage(formData, user.clerkUserId);
  if (!image.ok) return image;
  const styles = await textStylesCollection();
  const count = await styles.countDocuments({ clerkUserId: user.clerkUserId });
  if (count >= STYLE_MAX) return { ok: false, error: `最多 ${STYLE_MAX} 個文字樣式` };
  const now = new Date();
  await styles.insertOne({
    _id: new ObjectId(),
    clerkUserId: user.clerkUserId,
    name: named.name,
    imageUrl: image.url,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/app/text-styles");
  return { ok: true };
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
