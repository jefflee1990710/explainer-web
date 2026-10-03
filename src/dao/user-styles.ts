import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { UserStyleDoc } from "@/model/user-style";

export async function userStylesCollection(): Promise<Collection<UserStyleDoc>> {
  const db = await getDb();
  return db.collection<UserStyleDoc>("userStyles");
}
