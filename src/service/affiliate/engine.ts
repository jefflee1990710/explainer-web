import { ObjectId, type OptionalId } from "mongodb";
import {
  affiliateLedgerCollection,
  affiliatesCollection,
  creditLotsCollection,
  usersCollection,
} from "@/dao";
import { generateAffiliateCode, normalizeAffiliateCode } from "@/service/affiliate/code";
import {
  cashCentsPerUsd,
  planFifoSpendUsd,
  resolveLotUsdRemaining,
  type FifoLotInput,
  type LotSpendSliceUsd,
  type NewLotInput,
} from "@/service/affiliate/lots";
import { AFFILIATE_ENABLED, isAffiliateAccount } from "@/service/affiliate/enabled";
import {
  BUY_RATES,
  CONSUME_RATES,
  commissionCents,
} from "@/service/affiliate/rates";
import {
  fromUsdUnits,
  legacyCreditsToUsd,
  roundUsd4,
  subUsd,
  toUsdUnits,
} from "@/service/billing/usd";
import type {
  AffiliateLedgerEntry,
  AffiliateProfile,
  AffiliateTier,
  CreditLot,
} from "@/model/affiliate";
import type { AppUser } from "@/model/user";

const MAX_FIFO_LOT_RETRIES = 5;

// Executes FIFO lot deductions with optimistic-lock contention retries, returning strictly the committed USD and cash base.
export async function executeFifoLotDeductions<TLot extends FifoLotInput>(input: {
  spendUsd: number;
  loadLots: () => Promise<TLot[]>;
  applySlice: (lot: TLot, slice: LotSpendSliceUsd, nextRemaining: number) => Promise<boolean>;
  maxRetries?: number;
}): Promise<{ allocatedUsd: number; allocatedAmountCents: number }> {
  const maxRetries = input.maxRetries ?? MAX_FIFO_LOT_RETRIES;
  let remainingUnits = Math.max(0, toUsdUnits(input.spendUsd));
  let allocatedUnits = 0;
  let allocatedAmountCents = 0;

  for (let attempt = 0; attempt <= maxRetries && remainingUnits > 0; attempt++) {
    const lots = await input.loadLots();
    const plan = planFifoSpendUsd(lots, fromUsdUnits(remainingUnits));
    if (plan.slices.length === 0) break;

    const lotsById = new Map(lots.map((l) => [l._id.toHexString(), l]));
    let contended = false;

    for (const slice of plan.slices) {
      const lot = lotsById.get(slice.lotId);
      if (!lot) continue;
      const nextRemaining = Math.max(0, subUsd(resolveLotUsdRemaining(lot), slice.creditUsd));
      const committed = await input.applySlice(lot, slice, nextRemaining);
      if (committed) {
        const sliceUnits = toUsdUnits(slice.creditUsd);
        remainingUnits = Math.max(0, remainingUnits - sliceUnits);
        allocatedUnits += sliceUnits;
        allocatedAmountCents += slice.amountCents;
      } else {
        // Re-read remaining lots and re-plan for the unallocated balance on optimistic-lock miss.
        contended = true;
        break;
      }
    }

    if (!contended) break;
  }

  return {
    allocatedUsd: fromUsdUnits(allocatedUnits),
    allocatedAmountCents,
  };
}

export async function ensureAffiliateProfile(
  user: Pick<AppUser, "_id" | "clerkUserId">,
): Promise<AffiliateProfile> {
  const affiliates = await affiliatesCollection();
  const existing = await affiliates.findOne({ clerkUserId: user.clerkUserId });
  if (existing) return existing;

  // Unique indexes (idempotent).
  await affiliates.createIndex({ clerkUserId: 1 }, { unique: true }).catch(() => {});
  await affiliates.createIndex({ code: 1 }, { unique: true }).catch(() => {});

  const now = new Date();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateAffiliateCode();
    try {
      const doc: OptionalId<AffiliateProfile> = {
        clerkUserId: user.clerkUserId,
        userId: user._id,
        code,
        pendingCents: 0,
        paidCents: 0,
        lifetimeEarnedCents: 0,
        createdAt: now,
        updatedAt: now,
      };
      const insert = await affiliates.insertOne(doc);
      return { ...doc, _id: insert.insertedId } as AffiliateProfile;
    } catch {
      // Unique code collision — retry.
    }
  }
  throw new Error("無法建立推薦碼");
}

export async function findAffiliateByCode(code: string) {
  const normalized = normalizeAffiliateCode(code);
  if (!normalized) return null;
  const affiliates = await affiliatesCollection();
  return affiliates.findOne({ code: normalized });
}

// Build upline chain for a new signup: [L1 direct, L2, L3].
export function buildUplineIds(
  referrer: Pick<AppUser, "_id" | "uplineUserIds">,
): ObjectId[] {
  const chain: ObjectId[] = [referrer._id];
  for (const id of referrer.uplineUserIds || []) {
    if (chain.length >= 3) break;
    chain.push(id);
  }
  return chain;
}

export async function bindReferralOnSignup(
  newUser: AppUser,
  referralCode: string | undefined | null,
): Promise<AppUser> {
  if (!AFFILIATE_ENABLED) return newUser;
  if (newUser.referredByUserId) return newUser;
  if (!referralCode) return newUser;

  const affiliate = await findAffiliateByCode(referralCode);
  if (!affiliate) return newUser;
  if (affiliate.clerkUserId === newUser.clerkUserId) return newUser;

  const users = await usersCollection();
  const referrer = await users.findOne({ clerkUserId: affiliate.clerkUserId });
  if (!referrer || !isAffiliateAccount(referrer)) return newUser;

  // Block cycles: refuse if new user id already appears in referrer's upline.
  const upline = buildUplineIds(referrer);
  if (upline.some((id) => id.equals(newUser._id))) return newUser;

  await users.updateOne(
    { _id: newUser._id, referredByUserId: { $exists: false } },
    {
      $set: {
        referredByUserId: referrer._id,
        uplineUserIds: upline,
        updatedAt: new Date(),
      },
    },
  );

  return {
    ...newUser,
    referredByUserId: referrer._id,
    uplineUserIds: upline,
  };
}

async function creditAffiliate(
  affiliateClerkUserId: string,
  amountCents: number,
) {
  if (amountCents === 0) return;
  const affiliates = await affiliatesCollection();
  await affiliates.updateOne(
    { clerkUserId: affiliateClerkUserId },
    {
      $inc: {
        pendingCents: amountCents,
        lifetimeEarnedCents: amountCents > 0 ? amountCents : 0,
      },
      $set: { updatedAt: new Date() },
    },
  );
}

async function writeLedger(
  entry: Omit<OptionalId<AffiliateLedgerEntry>, "createdAt"> & {
    createdAt?: Date;
  },
) {
  const ledger = await affiliateLedgerCollection();
  await ledger.createIndex({ eventKey: 1 }, { unique: true }).catch(() => {});
  try {
    await ledger.insertOne({
      ...entry,
      createdAt: entry.createdAt || new Date(),
    } as OptionalId<AffiliateLedgerEntry>);
    return true;
  } catch {
    // Duplicate eventKey — already processed.
    return false;
  }
}

async function uplineClerkIds(source: AppUser): Promise<
  { tier: AffiliateTier; clerkUserId: string }[]
> {
  const uplineIds = source.uplineUserIds || [];
  if (uplineIds.length === 0) return [];
  const users = await usersCollection();
  const uplineUsers = await users
    .find({ _id: { $in: uplineIds } })
    .toArray();
  const byId = new Map(uplineUsers.map((u) => [u._id.toHexString(), u]));
  const result: { tier: AffiliateTier; clerkUserId: string }[] = [];
  for (let i = 0; i < Math.min(uplineIds.length, 3); i++) {
    const id = uplineIds[i]!;
    const user = byId.get(id.toHexString());
    if (!user || !isAffiliateAccount(user)) continue;
    if (user.clerkUserId === source.clerkUserId) continue;
    result.push({ tier: (i + 1) as AffiliateTier, clerkUserId: user.clerkUserId });
  }
  return result;
}

// Record purchase commission + create FIFO USD credit lot.
export async function recordPurchaseCommission(input: {
  buyerClerkUserId: string;
  amountPaidCents: number;
  creditUsd: number;
  lot: NewLotInput;
  eventKey: string;
}) {
  if (!AFFILIATE_ENABLED) return;
  const users = await usersCollection();
  const buyer = await users.findOne({ clerkUserId: input.buyerClerkUserId });
  if (!buyer) return;

  const creditUsd = Math.max(0, roundUsd4(input.creditUsd));
  const ratePerUsd = cashCentsPerUsd(input.amountPaidCents, creditUsd);

  // Create USD credit lot for FIFO consume pricing.
  if (toUsdUnits(creditUsd) > 0) {
    const lots = await creditLotsCollection();
    await lots.createIndex({ sourceId: 1 }, { unique: true }).catch(() => {});
    await lots.createIndex({ clerkUserId: 1, createdAt: 1 }).catch(() => {});
    const doc: OptionalId<CreditLot> = {
      clerkUserId: input.buyerClerkUserId,
      source: input.lot.source,
      sourceId: input.lot.sourceId,
      creditUsdRemaining: creditUsd,
      creditUsdOriginal: creditUsd,
      cashCentsPerUsd: ratePerUsd,
      amountPaidCents: input.amountPaidCents,
      createdAt: new Date(),
    };
    try {
      await lots.insertOne(doc);
    } catch {
      // Duplicate sourceId — lot already recorded.
    }
  }

  if (input.amountPaidCents <= 0) return;

  const uplines = await uplineClerkIds(buyer);
  for (const { tier, clerkUserId } of uplines) {
    const rate = BUY_RATES[tier];
    const amountCents = commissionCents(input.amountPaidCents, rate);
    if (amountCents <= 0) continue;
    const eventKey = `${input.eventKey}:buy:L${tier}`;
    const inserted = await writeLedger({
      affiliateClerkUserId: clerkUserId,
      sourceClerkUserId: input.buyerClerkUserId,
      tier,
      kind: "buy",
      amountCents,
      rate,
      baseAmountCents: input.amountPaidCents,
      creditUsd,
      cashCentsPerUsd: ratePerUsd,
      eventKey,
    });
    if (inserted) await creditAffiliate(clerkUserId, amountCents);
  }
}

// Deduct FIFO USD credit lots (retrying on optimistic-lock contention) and pay consume commissions to uplines.
export async function recordConsumeCommission(
  spenderClerkUserId: string,
  creditUsd: number,
  eventKey: string,
) {
  if (!AFFILIATE_ENABLED) return;
  const spend = Math.max(0, roundUsd4(creditUsd));
  if (toUsdUnits(spend) <= 0) return;

  const users = await usersCollection();
  const spender = await users.findOne({ clerkUserId: spenderClerkUserId });
  if (!spender) return;

  const lotsCol = await creditLotsCollection();
  const { allocatedUsd, allocatedAmountCents } = await executeFifoLotDeductions({
    spendUsd: spend,
    loadLots: () =>
      lotsCol
        .find({
          clerkUserId: spenderClerkUserId,
          $or: [
            { creditUsdRemaining: { $gt: 0 } },
            { creditUsdRemaining: { $exists: false }, creditsRemaining: { $gt: 0 } },
          ],
        })
        .sort({ createdAt: 1 })
        .toArray(),
    applySlice: async (lot, slice, nextRemaining) => {
      if (!slice.isLegacy) {
        const res = await lotsCol.updateOne(
          { _id: new ObjectId(slice.lotId), creditUsdRemaining: lot.creditUsdRemaining },
          { $set: { creditUsdRemaining: nextRemaining } },
        );
        return res.modifiedCount === 1;
      }
      const origUsd = legacyCreditsToUsd(lot.creditsOriginal ?? lot.creditsRemaining ?? 0);
      const res = await lotsCol.updateOne(
        {
          _id: new ObjectId(slice.lotId),
          creditUsdRemaining: { $exists: false },
          ...(typeof lot.creditsRemaining === "number"
            ? { creditsRemaining: lot.creditsRemaining }
            : { creditsRemaining: { $exists: false } }),
        },
        {
          $set: {
            creditUsdRemaining: nextRemaining,
            creditUsdOriginal: origUsd,
            cashCentsPerUsd: slice.cashCentsPerUsd,
          },
        },
      );
      return res.modifiedCount === 1;
    },
  });

  if (allocatedAmountCents <= 0 || toUsdUnits(allocatedUsd) <= 0) return;

  const effectiveRate = cashCentsPerUsd(allocatedAmountCents, allocatedUsd);
  const uplines = await uplineClerkIds(spender);
  for (const { tier, clerkUserId } of uplines) {
    const rate = CONSUME_RATES[tier];
    const amountCents = commissionCents(allocatedAmountCents, rate);
    if (amountCents <= 0) continue;
    const key = `${eventKey}:consume:L${tier}`;
    const inserted = await writeLedger({
      affiliateClerkUserId: clerkUserId,
      sourceClerkUserId: spenderClerkUserId,
      tier,
      kind: "consume",
      amountCents,
      rate,
      baseAmountCents: allocatedAmountCents,
      creditUsd: allocatedUsd,
      cashCentsPerUsd: effectiveRate,
      eventKey: key,
    });
    if (inserted) await creditAffiliate(clerkUserId, amountCents);
  }
}

// Reverse consume commissions for a failed generation refund and restore a FIFO USD lot.
export async function reverseConsumeCommission(
  spenderClerkUserId: string,
  creditUsd: number,
  originalEventKey?: string,
) {
  if (!AFFILIATE_ENABLED) return;
  const refunded = Math.max(0, roundUsd4(creditUsd));
  if (toUsdUnits(refunded) <= 0) return;

  const ledger = await affiliateLedgerCollection();
  let originals =
    originalEventKey
      ? await ledger
          .find({
            sourceClerkUserId: spenderClerkUserId,
            kind: "consume",
            eventKey: {
              $regex: `^${escapeRegex(originalEventKey)}:consume:L`,
            },
          })
          .toArray()
      : [];

  // Async refunds (webhook) may lack the spend key — reverse a matching recent consume by USD amount.
  if (originals.length === 0) {
    const recent = await ledger
      .find({
        sourceClerkUserId: spenderClerkUserId,
        kind: "consume",
        creditUsd: refunded,
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();
    const grouped = new Map<string, typeof recent>();
    for (const entry of recent) {
      const prefix = entry.eventKey.replace(/:consume:L\d+$/, "");
      const list = grouped.get(prefix) || [];
      list.push(entry);
      grouped.set(prefix, list);
    }
    const firstGroup = grouped.values().next().value;
    if (firstGroup) originals = firstGroup;
  }

  for (const original of originals) {
    const reverseKey = `${original.eventKey}:reverse`;
    const inserted = await writeLedger({
      affiliateClerkUserId: original.affiliateClerkUserId,
      sourceClerkUserId: spenderClerkUserId,
      tier: original.tier,
      kind: "consume_reverse",
      amountCents: -original.amountCents,
      rate: original.rate,
      baseAmountCents: original.baseAmountCents,
      creditUsd: original.creditUsd ?? refunded,
      cashCentsPerUsd: original.cashCentsPerUsd,
      eventKey: reverseKey,
      reversesEventKey: original.eventKey,
    });
    if (inserted) {
      await creditAffiliate(original.affiliateClerkUserId, -original.amountCents);
    }
  }

  // Restore a FIFO USD lot so later spends still price correctly.
  if (originals.length > 0) {
    const base = originals[0]!.baseAmountCents;
    const sourceId = `refund:${originalEventKey || originals[0]!.eventKey}`;
    const lots = await creditLotsCollection();
    try {
      await lots.insertOne({
        clerkUserId: spenderClerkUserId,
        source: "bonus",
        sourceId,
        creditUsdRemaining: refunded,
        creditUsdOriginal: refunded,
        cashCentsPerUsd: cashCentsPerUsd(base, refunded),
        amountPaidCents: base,
        createdAt: new Date(),
      } as OptionalId<CreditLot>);
    } catch {
      // Duplicate refund lot.
    }
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { BUY_RATES, CONSUME_RATES };
