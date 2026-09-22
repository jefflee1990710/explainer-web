import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { CreditLot } from "@/model/affiliate";

export async function creditLotsCollection(): Promise<
  Collection<OptionalId<CreditLot>>
> {
  const db = await getDb();
  return db.collection<OptionalId<CreditLot>>("creditLots");
}
