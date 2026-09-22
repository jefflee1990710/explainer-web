import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Skill } from "@/model/skill";

export async function skillsCollection(): Promise<Collection<OptionalId<Skill>>> {
  const db = await getDb();
  return db.collection<OptionalId<Skill>>("skills");
}
