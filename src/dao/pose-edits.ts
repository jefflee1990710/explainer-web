import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { PoseEdit } from "@/model/pose-edit";

let indexPromise: Promise<string> | undefined;

export async function poseEditsCollection(): Promise<Collection<OptionalId<PoseEdit>>> {
  const db = await getDb();
  const collection = db.collection<OptionalId<PoseEdit>>("pose_edits");
  if (!indexPromise) {
    // A rejected createIndex must not stick for the life of the process.
    const slot: { current?: Promise<string> } = {};
    const settled = collection.createIndex({ clerkUserId: 1, createdAt: -1 }).then(
      (name) => name,
      (error: unknown) => {
        if (indexPromise === slot.current) indexPromise = undefined;
        throw error;
      },
    );
    slot.current = settled;
    indexPromise = settled;
  }
  await indexPromise;
  return collection;
}
