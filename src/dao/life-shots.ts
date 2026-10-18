import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { LifeShot } from "@/model/life-shot";

export async function lifeShotsCollection(): Promise<Collection<OptionalId<LifeShot>>> {
  const db = await getDb();
  return db.collection<OptionalId<LifeShot>>("life_shots");
}
