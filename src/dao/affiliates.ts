import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { AffiliateProfile } from "@/model/affiliate";

export async function affiliatesCollection(): Promise<
  Collection<OptionalId<AffiliateProfile>>
> {
  const db = await getDb();
  return db.collection<OptionalId<AffiliateProfile>>("affiliates");
}
