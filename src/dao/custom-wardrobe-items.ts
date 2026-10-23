import { getDb } from "@/dao/mongo";
import type { CustomWardrobeItem } from "@/model/custom-wardrobe-item";

let indexed = false;

export async function customWardrobeItemsCollection() {
  const db = await getDb();
  const collection = db.collection<CustomWardrobeItem>("custom_wardrobe_items");
  if (!indexed) {
    indexed = true;
    await collection.createIndex({ clerkUserId: 1, part: 1, createdAt: -1 });
  }
  return collection;
}
