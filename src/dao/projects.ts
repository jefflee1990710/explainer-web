import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Folder } from "@/model/folder";

export async function projectsCollection(): Promise<
  Collection<OptionalId<Folder>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Folder>>("projects");
}
