import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import { cashCentsPerUsd, planFifoSpendUsd } from "@/service/affiliate/lots";
import {
  BUY_RATES,
  CONSUME_RATES,
  commissionCents,
  maxStackPct,
} from "@/service/affiliate/rates";
import { buildUplineIds, executeFifoLotDeductions } from "@/service/affiliate/engine";
import { normalizeAffiliateCode } from "@/service/affiliate/code";

describe("affiliate rates", () => {
  it("keeps stack at 25%", () => {
    assert.equal(maxStackPct(), 25);
  });

  it("computes commission cents with floor", () => {
    // Scale $399 → 39900 cents × 15% = 5985
    assert.equal(commissionCents(39900, BUY_RATES[1]), 5985);
    assert.equal(commissionCents(39900, BUY_RATES[2]), 1596);
    assert.equal(commissionCents(39900, BUY_RATES[3]), 598);
  });

  it("prices consume against paid base", () => {
    const base = 1000; // $10 cash base spent
    assert.equal(commissionCents(base, CONSUME_RATES[1]), 30);
    assert.equal(commissionCents(base, CONSUME_RATES[2]), 10);
    assert.equal(commissionCents(base, CONSUME_RATES[3]), 5);
  });
});

describe("USD FIFO lots", () => {
  it("computes exact cash cents per USD credit for discounted plans and bonus packs", () => {
    // $59.00 Starter plan at 85% signup promo ($50.15 paid) -> 85 cents per $1.00 USD credit
    assert.equal(cashCentsPerUsd(5015, 59), 85);
    // $10.00 pack with 5% adhoc bonus ($10.50 granted) -> 1000 / 10.5 cents per $1.00 USD credit
    assert.equal(cashCentsPerUsd(1000, 10.5), 1000 / 10.5);
    // Guard non-positive inputs
    assert.equal(cashCentsPerUsd(1000, 0), 0);
    assert.equal(cashCentsPerUsd(0, 10), 0);
  });

  it("spends oldest USD lots first and computes exact consume commission and reversal cents", () => {
    const subLotId = new ObjectId();
    const packLotId = new ObjectId();
    const subRate = cashCentsPerUsd(5015, 59); // 85
    const packRate = cashCentsPerUsd(1000, 10.5); // 95.238095...

    const plan = planFifoSpendUsd(
      [
        {
          _id: subLotId,
          creditUsdRemaining: 59,
          cashCentsPerUsd: subRate,
          amountPaidCents: 5015,
        },
        {
          _id: packLotId,
          creditUsdRemaining: 10.5,
          cashCentsPerUsd: packRate,
          amountPaidCents: 1000,
        },
      ],
      69.5,
    );

    assert.equal(plan.slices.length, 2);
    assert.equal(plan.slices[0]!.lotId, subLotId.toHexString());
    assert.equal(plan.slices[0]!.creditUsd, 59);
    assert.equal(plan.slices[0]!.cashCentsPerUsd, 85);
    assert.equal(plan.slices[0]!.amountCents, 5015);

    assert.equal(plan.slices[1]!.lotId, packLotId.toHexString());
    assert.equal(plan.slices[1]!.creditUsd, 10.5);
    assert.equal(plan.slices[1]!.cashCentsPerUsd, 1000 / 10.5);
    assert.equal(plan.slices[1]!.amountCents, 1000);
    assert.equal(plan.totalAmountCents, 6015);

    // Verify exact commission cents across tiers and exact reversal symmetry
    const l1 = commissionCents(plan.totalAmountCents, CONSUME_RATES[1]);
    const l2 = commissionCents(plan.totalAmountCents, CONSUME_RATES[2]);
    const l3 = commissionCents(plan.totalAmountCents, CONSUME_RATES[3]);
    assert.equal(l1, 180); // floor(6015 * 0.03) = 180
    assert.equal(l2, 60); // floor(6015 * 0.01) = 60
    assert.equal(l3, 30); // floor(6015 * 0.005) = 30
    // Reversal negates exact earned commission cents and restores lot at original cash rate
    const restoredRate = cashCentsPerUsd(plan.totalAmountCents, 69.5);
    const replay = planFifoSpendUsd(
      [
        {
          _id: new ObjectId(),
          creditUsdRemaining: 69.5,
          cashCentsPerUsd: restoredRate,
          amountPaidCents: plan.totalAmountCents,
        },
      ],
      69.5,
    );
    assert.equal(replay.totalAmountCents, 6015);
    assert.equal(-l1 + commissionCents(replay.totalAmountCents, CONSUME_RATES[1]), 0);
  });

  it("lazily resolves unmigrated legacy integer credit lots via legacyCreditsToUsd", () => {
    const legacyLotId = new ObjectId();
    // 50 legacy credits remaining * $0.04 = $2.00 remaining; 100 original = $4.00 original for $4.00 paid (100 cents/USD)
    const plan = planFifoSpendUsd(
      [
        {
          _id: legacyLotId,
          creditsRemaining: 50,
          creditsOriginal: 100,
          usdPerCreditCents: 4,
          amountPaidCents: 400,
        },
      ],
      1.25,
    );

    assert.equal(plan.slices.length, 1);
    assert.equal(plan.slices[0]!.lotId, legacyLotId.toHexString());
    assert.equal(plan.slices[0]!.creditUsd, 1.25);
    assert.equal(plan.slices[0]!.cashCentsPerUsd, 100);
    assert.equal(plan.slices[0]!.amountCents, 125);
    assert.equal(plan.totalAmountCents, 125);
  });

  it("retries on optimistic-lock contention and only counts committed lot slices", async () => {
    const lot1Id = new ObjectId();
    const lot2Id = new ObjectId();
    // Initial snapshot has $10 on lot1 (85c/$) and $10 on lot2 (100c/$).
    // First attempt misses on lot1 because a concurrent spend reduced lot1 to $4.
    let readCount = 0;
    const state = [
      { _id: lot1Id, creditUsdRemaining: 10, cashCentsPerUsd: 85, amountPaidCents: 850 },
      { _id: lot2Id, creditUsdRemaining: 10, cashCentsPerUsd: 100, amountPaidCents: 1000 },
    ];

    const result = await executeFifoLotDeductions({
      spendUsd: 8,
      loadLots: async () => {
        readCount += 1;
        return state.map((l) => ({ ...l }));
      },
      applySlice: async (lot, _slice, nextRemaining) => {
        if (readCount === 1 && lot._id.equals(lot1Id)) {
          // Simulate concurrent spend reducing lot1 from $10 to $4 before our update lands.
          state[0]!.creditUsdRemaining = 4;
          return false;
        }
        const target = state.find((l) => l._id.equals(lot._id));
        if (!target || target.creditUsdRemaining !== lot.creditUsdRemaining) return false;
        target.creditUsdRemaining = nextRemaining;
        return true;
      },
    });

    assert.equal(readCount, 2);
    // $4 from lot1 @ 85c = 340c, plus $4 from lot2 @ 100c = 400c -> 740c total
    assert.equal(result.allocatedUsd, 8);
    assert.equal(result.allocatedAmountCents, 740);
    assert.equal(state[0]!.creditUsdRemaining, 0);
    assert.equal(state[1]!.creditUsdRemaining, 6);

    // When all lot updates fail due to contention, committed base stays 0 (no phantom commission).
    const failed = await executeFifoLotDeductions({
      spendUsd: 5,
      loadLots: async () => [
        { _id: new ObjectId(), creditUsdRemaining: 5, cashCentsPerUsd: 100, amountPaidCents: 500 },
      ],
      applySlice: async () => false,
      maxRetries: 2,
    });
    assert.equal(failed.allocatedUsd, 0);
    assert.equal(failed.allocatedAmountCents, 0);
  });
});

describe("upline chain", () => {
  it("builds at most 3 levels", () => {
    const l1 = new ObjectId();
    const l2 = new ObjectId();
    const l3 = new ObjectId();
    const l4 = new ObjectId();
    const chain = buildUplineIds({
      _id: l1,
      uplineUserIds: [l2, l3, l4],
    });
    assert.equal(chain.length, 3);
    assert.ok(chain[0]!.equals(l1));
    assert.ok(chain[1]!.equals(l2));
    assert.ok(chain[2]!.equals(l3));
  });
});

describe("affiliate code", () => {
  it("normalizes codes", () => {
    assert.equal(normalizeAffiliateCode(" ab-12 "), "AB12");
  });
});
