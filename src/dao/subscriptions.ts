import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Subscription } from "@/model/subscription";

export async function subscriptionsCollection(): Promise<
  Collection<OptionalId<Subscription>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Subscription>>("subscriptions");
}
