import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { BlogPost } from "@/model/blog-post";

let indexEnsured = false;

// Access the `blog_posts` MongoDB collection with a unique index on `slug`.
export async function blogPostsCollection(): Promise<Collection<OptionalId<BlogPost>>> {
  const db = await getDb();
  const collection = db.collection<OptionalId<BlogPost>>("blog_posts");
  if (!indexEnsured) {
    indexEnsured = true;
    collection.createIndex({ slug: 1 }, { unique: true }).catch(() => {
      indexEnsured = false;
    });
  }
  return collection;
}
