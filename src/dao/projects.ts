import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Folder } from "@/model/folder";

// Folder documents are stored in the MongoDB `projects` collection.
export async function projectsCollection(): Promise<
  Collection<OptionalId<Folder>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Folder>>("projects");
}

// Semantic alias for `projectsCollection` so callers can clearly distinguish Folders from Videos.
export const foldersCollection = projectsCollection;
