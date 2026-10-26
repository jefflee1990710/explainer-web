import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { WelcomeCreditGrant } from "@/model/welcome-credit-grant";

let indexPromise: Promise<string[]> | undefined;

// Typed accessor for welcome_credit_grants collection with lookup indexes.
export async function welcomeCreditGrantsCollection(): Promise<
  Collection<OptionalId<WelcomeCreditGrant>>
> {
  const db = await getDb();
  const collection = db.collection<OptionalId<WelcomeCreditGrant>>("welcome_credit_grants");
  if (!indexPromise) {
    const slot: { current?: Promise<string[]> } = {};
    const settled = Promise.all([
      collection.createIndex({ normalizedEmail: 1 }),
      collection.createIndex({ deviceId: 1 }, { sparse: true }),
      collection.createIndex({ ipHash: 1, grantedAt: -1 }, { sparse: true }),
    ]).then(
      (names) => names,
      (error: unknown) => {
        if (indexPromise === slot.current) indexPromise = undefined;
        throw error;
      },
    );
    slot.current = settled;
    indexPromise = settled;
  }
  await indexPromise;
  return collection;
}
