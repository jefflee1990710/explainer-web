import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { OpencutEdit } from "@/model/opencut-edit";

export async function opencutEditsCollection(): Promise<Collection<OpencutEdit>> {
  const db = await getDb();
  return db.collection<OpencutEdit>("opencutEdits");
}
