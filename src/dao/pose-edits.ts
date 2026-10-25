import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { PoseEdit } from "@/model/pose-edit";

let indexPromise: Promise<string | void> | undefined;

export async function poseEditsCollection(): Promise<Collection<OptionalId<PoseEdit>>> {
  const db = await getDb();
  const collection = db.collection<OptionalId<PoseEdit>>("pose_edits");
  if (!indexPromise) {
    indexPromise = collection.createIndex({ clerkUserId: 1, createdAt: -1 });
  }
  await indexPromise;
  return collection;
}
