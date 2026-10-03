import { ObjectId } from "mongodb";
import { stylesCollection } from "@/dao";
import { userStylesCollection } from "@/dao/user-styles";
import { isStyleId, type StyleId } from "@/model/style-id";
import type { UserStyleDoc } from "@/model/user-style";
import { requireAppUser } from "@/service/auth";
import { styleFromDoc } from "@/service/style/load-style";
import {
  copyUserStyleFields,
  parseUserStyleFields,
  parseUserStyleMeta,
} from "@/service/style/user-style-fields";
import type { Style } from "@/service/style/types";

export type CreateUserStyleResult = { ok: true; id: string } | { ok: false; error: string };
export type SaveUserStyleResult = { ok: true } | { ok: false; error: string };
export type DeleteUserStyleResult = { ok: true } | { ok: false; error: string };

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
