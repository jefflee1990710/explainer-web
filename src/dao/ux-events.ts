import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { UxEvent } from "@/model/ux-event";

let indexesEnsured = false;

// MongoDB collection accessor for user journey and blocker tracking (`ux_events`).
export async function uxEventsCollection(): Promise<
  Collection<OptionalId<UxEvent>>
> {
  const db = await getDb();
  const collection = db.collection<OptionalId<UxEvent>>("ux_events");
  if (!indexesEnsured) {
    indexesEnsured = true;
    void Promise.all([
      collection.createIndex({ createdAt: -1 }),
      collection.createIndex({ clerkUserId: 1, createdAt: -1 }),
      collection.createIndex({ event: 1, createdAt: -1 }),
      collection.createIndex({ category: 1, createdAt: -1 }),
    ]).catch(() => {
      indexesEnsured = false;
    });
  }
  return collection;
}
