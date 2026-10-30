import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { DirectorVisibility } from "@/model/director-visibility";

// One document lists builtin director slugs hidden from everyone except the operator inbox.
export async function directorVisibilityCollection(): Promise<Collection<DirectorVisibility>> {
  const db = await getDb();
  return db.collection<DirectorVisibility>("director_visibility");
}
