import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Skill } from "@/model/skill";

// User-created standalone directors (`IDirector` documents owned by a user).
export async function directorsCollection(): Promise<Collection<OptionalId<Skill>>> {
  const db = await getDb();
  return db.collection<OptionalId<Skill>>("directors");
}
