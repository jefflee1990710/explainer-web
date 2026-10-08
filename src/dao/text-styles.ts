import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { TextStyleDoc } from "@/model/text-style";

export async function textStylesCollection(): Promise<Collection<TextStyleDoc>> {
  const db = await getDb();
  return db.collection<TextStyleDoc>("textStyles");
}
