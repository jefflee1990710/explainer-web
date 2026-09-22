import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { AppUser } from "@/model/user";

export async function usersCollection(): Promise<Collection<OptionalId<AppUser>>> {
  const db = await getDb();
  return db.collection<OptionalId<AppUser>>("users");
}
