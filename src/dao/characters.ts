import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Character } from "@/model/character";

export async function charactersCollection(): Promise<
  Collection<OptionalId<Character>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Character>>("characters");
}
