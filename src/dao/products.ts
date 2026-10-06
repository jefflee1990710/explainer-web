import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { Product } from "@/model/product";

export async function productsCollection(): Promise<Collection<OptionalId<Product>>> {
  const db = await getDb();
  return db.collection<OptionalId<Product>>("products");
}
