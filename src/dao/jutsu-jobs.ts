import type { OptionalId } from "mongodb";
import type { JutsuJob } from "@/model/jutsu-job";
import { getDb } from "./mongo";

let indexed = false;

// MongoDB collection accessor for Scro Jutsu jobs (`jutsu_jobs`).
export async function jutsuJobsCollection() {
  const db = await getDb();
  const collection = db.collection<OptionalId<JutsuJob>>("jutsu_jobs");
  if (!indexed) {
    indexed = true;
    await Promise.all([
      collection.createIndex({ clerkUserId: 1, createdAt: -1 }),
      collection.createIndex({ status: 1, updatedAt: -1 }),
    ]).catch(() => {
      indexed = false;
    });
  }
  return collection;
}
