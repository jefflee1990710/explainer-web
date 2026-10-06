import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Post } from "@/model/post";

export async function postsCollection(): Promise<Collection<OptionalId<Post>>> {
  const db = await getDb();
  return db.collection<OptionalId<Post>>("posts");
}
