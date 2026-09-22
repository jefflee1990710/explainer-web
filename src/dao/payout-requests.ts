import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { PayoutRequest } from "@/model/affiliate";

export async function payoutRequestsCollection(): Promise<
  Collection<OptionalId<PayoutRequest>>
> {
  const db = await getDb();
  return db.collection<OptionalId<PayoutRequest>>("payoutRequests");
}
