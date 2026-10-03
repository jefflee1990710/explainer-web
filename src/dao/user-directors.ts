import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Skill } from "@/model/skill";

// Custom directors. System skills stay in `skills`. Documents keep the `_id`
// that existing videos already store as `skillId`.
export async function userDirectorsCollection(): Promise<Collection<OptionalId<Skill>>> {
  const db = await getDb();
  return db.collection<OptionalId<Skill>>("userDirectors");
}
