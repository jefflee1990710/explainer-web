// Canvas library folders: one level, owned by the user. Deleting a folder unfiles its canvases.

import { ObjectId } from "mongodb";
import { canvasFoldersCollection, canvasProjectsCollection } from "@/dao";
import type { CanvasFolder } from "@/model/canvas";
import type { CanvasFolderDto } from "@/model/canvas-dto";
import { normalizeCanvasFolderName } from "@/service/canvas/folder-library";

export function serializeCanvasFolder(folder: CanvasFolder): CanvasFolderDto {
  return {
    id: folder._id.toHexString(),
    name: folder.name,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

export async function listCanvasFolders(clerkUserId: string): Promise<CanvasFolder[]> {
  const folders = await canvasFoldersCollection();
  return folders.find({ clerkUserId }).sort({ updatedAt: -1 }).toArray();
}

export async function createCanvasFolder(
  clerkUserId: string,
  name: string,
): Promise<CanvasFolder | null> {
  const trimmed = normalizeCanvasFolderName(name);
  if (!trimmed) return null;
  const folders = await canvasFoldersCollection();
  const now = new Date();
  const doc: CanvasFolder = {
    _id: new ObjectId(),
    clerkUserId,
    name: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  await folders.insertOne(doc);
  return doc;
}

export async function renameCanvasFolder(
  clerkUserId: string,
  folderId: string,
  name: string,
): Promise<CanvasFolder | null> {
  const trimmed = normalizeCanvasFolderName(name);
  if (!trimmed || !ObjectId.isValid(folderId)) return null;
  const folders = await canvasFoldersCollection();
  return folders.findOneAndUpdate(
    { _id: new ObjectId(folderId), clerkUserId },
    { $set: { name: trimmed, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

// Removes the folder and leaves its canvases unfiled.
export async function deleteCanvasFolder(
  clerkUserId: string,
  folderId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(folderId)) return false;
  const id = new ObjectId(folderId);
  const folders = await canvasFoldersCollection();
  const removed = await folders.deleteOne({ _id: id, clerkUserId });
  if (removed.deletedCount !== 1) return false;
  const projects = await canvasProjectsCollection();
  await projects.updateMany({ clerkUserId, folderId: id }, { $unset: { folderId: "" } });
  return true;
}

// Moves a canvas into a folder, or unfiles it when folderId is null.
export async function moveCanvasToFolder(
  clerkUserId: string,
  canvasId: string,
  folderId: string | null,
): Promise<boolean> {
  if (!ObjectId.isValid(canvasId)) return false;
  const projects = await canvasProjectsCollection();
  if (!folderId) {
    const res = await projects.updateOne(
      { _id: new ObjectId(canvasId), clerkUserId },
      { $unset: { folderId: "" }, $set: { updatedAt: new Date() } },
    );
    return res.matchedCount === 1;
  }
  if (!ObjectId.isValid(folderId)) return false;
  const folders = await canvasFoldersCollection();
  const folder = await folders.findOne({ _id: new ObjectId(folderId), clerkUserId });
  if (!folder) return false;
  const res = await projects.updateOne(
    { _id: new ObjectId(canvasId), clerkUserId },
    { $set: { folderId: folder._id, updatedAt: new Date() } },
  );
  return res.matchedCount === 1;
}
