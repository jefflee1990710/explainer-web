import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import { planFifoSpend, usdPerCreditCents } from "@/service/affiliate/lots";
import {
  BUY_RATES,
  CONSUME_RATES,
  commissionCents,
  maxStackPct,
} from "@/service/affiliate/rates";
import { buildUplineIds } from "@/service/affiliate/engine";
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
    const base = 1000; // $10 of credits spent
    assert.equal(commissionCents(base, CONSUME_RATES[1]), 30);
    assert.equal(commissionCents(base, CONSUME_RATES[2]), 10);
    assert.equal(commissionCents(base, CONSUME_RATES[3]), 5);
  });
});

describe("FIFO lots", () => {
  it("spends oldest lots first", () => {
    const a = new ObjectId();
    const b = new ObjectId();
    const plan = planFifoSpend(
      [
        { _id: a, creditsRemaining: 2, usdPerCreditCents: 100 },
        { _id: b, creditsRemaining: 5, usdPerCreditCents: 200 },
      ],
      4,
    );
    assert.equal(plan.slices.length, 2);
    assert.equal(plan.slices[0]!.lotId, a.toHexString());
    assert.equal(plan.slices[0]!.credits, 2);
    assert.equal(plan.slices[0]!.amountCents, 200);
    assert.equal(plan.slices[1]!.credits, 2);
    assert.equal(plan.slices[1]!.amountCents, 400);
    assert.equal(plan.totalAmountCents, 600);
  });

  it("computes per-credit cents", () => {
    assert.equal(usdPerCreditCents(5900, 30), 196);
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
