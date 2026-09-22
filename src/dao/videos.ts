import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Project } from "@/model/project";

export async function videosCollection(): Promise<
  Collection<OptionalId<Project>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Project>>("videos");
}
