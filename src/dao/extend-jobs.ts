import type { OptionalId } from "mongodb";
import type { ExtendJob } from "@/model/extend-job";
import { getDb } from "./mongo";

let indexed = false;

export async function extendJobsCollection() {
  const db = await getDb();
  const collection = db.collection<OptionalId<ExtendJob>>("extend_jobs");
  if (!indexed) {
    indexed = true;
    await Promise.all([
      collection.createIndex({ clerkUserId: 1, createdAt: -1 }),
      collection.createIndex({ status: 1, updatedAt: -1 }),
      collection.createIndex({ targetVideoId: 1, updatedAt: -1 }),
    ]).catch(() => {
      indexed = false;
    });
  }
  return collection;
}
