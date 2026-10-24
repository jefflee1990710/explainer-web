import { getDb } from "@/dao/mongo";
import type { WardrobeCombinationDoc } from "@/model/wardrobe-combination";

let indexed = false;

// MongoDB collection accessor for recommended wardrobe combinations distilled from IG posts.
export async function wardrobeCombinationsCollection() {
  const db = await getDb();
  const collection = db.collection<WardrobeCombinationDoc>("wardrobe_combinations");
  if (!indexed) {
    indexed = true;
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ "sourcePost.account": 1, "sourcePost.shortcode": 1 });
    await collection.createIndex({ tags: 1 });
    await collection.createIndex({
      "items.top": 1,
      "items.pants": 1,
      "items.shoes": 1,
      "items.accessory": 1,
    });
  }
  return collection;
}
