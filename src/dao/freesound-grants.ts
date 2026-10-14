import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { FreesoundGrantDoc } from "@/model/freesound-grant";

export async function freesoundGrantsCollection(): Promise<Collection<FreesoundGrantDoc>> {
  const db = await getDb();
  return db.collection<FreesoundGrantDoc>("freesoundGrants");
}
