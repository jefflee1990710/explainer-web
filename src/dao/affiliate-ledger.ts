import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { AffiliateLedgerEntry } from "@/model/affiliate";

export async function affiliateLedgerCollection(): Promise<
  Collection<OptionalId<AffiliateLedgerEntry>>
> {
  const db = await getDb();
  return db.collection<OptionalId<AffiliateLedgerEntry>>("affiliateLedger");
}
