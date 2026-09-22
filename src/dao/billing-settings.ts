import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { BillingSettings } from "@/model/billing-settings";

export async function billingSettingsCollection(): Promise<
  Collection<OptionalId<BillingSettings>>
> {
  const db = await getDb();
  return db.collection<OptionalId<BillingSettings>>("settings");
}
