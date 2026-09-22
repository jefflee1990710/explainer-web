import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { StyleDoc } from "@/model/style-doc";

export async function stylesCollection(): Promise<Collection<StyleDoc>> {
  const db = await getDb();
  return db.collection<StyleDoc>("styles");
}
