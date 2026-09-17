import type { ObjectId } from "mongodb";
import type { StyleId } from "@/lib/styles";

export type CharacterVersionStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed";

// One generated blueprint sheet. Versions are append-only.
export type CharacterVersion = {
  id: ObjectId;
  // Set when this version was made via「從此版本編輯」.
  parentVersionId?: ObjectId;
  // Full effective description used for this generation.
  prompt: string;
  editInstruction?: string;
  // Uploaded reference (v1) or the parent blueprint (edits).
  referenceImageUrl?: string;
  // Blob URL once the sheet is persisted.
  blueprintUrl?: string;
  status: CharacterVersionStatus;
  error?: string;
  creditsCharged: boolean;
  createdAt: Date;
};

// Reusable character owned by one user.
export type Character = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  name: string;
  styleId: StyleId;
  defaultVersionId?: ObjectId;
  versions: CharacterVersion[];
  createdAt: Date;
  updatedAt: Date;
};

// Snapshot of a character's default version stored on a video at creation.
export type CastMember = {
  characterId: ObjectId;
  versionId: ObjectId;
  name: string;
  blueprintUrl: string;
  prompt: string;
};
