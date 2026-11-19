# USD Credit Billing Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Scro's integer `credits` currency across the entire `explainer-web` codebase, public website, REST API, MCP server, documentation, and `explainer-app` Flutter mobile client with a USD Credit Remaining (`creditUsd`) balance model aligned with Mentalok AI Studio.

**Architecture:** Introduce `$0.0001`-precision USD integer-unit arithmetic (`src/service/billing/usd.ts`) and add canonical USD fields (`creditUsd`, `bonusCreditUsd`, `creditLimitUsd`, `creditMigratedAt`, `monthlyCreditUsd`, `chargedUsd`) to MongoDB documents with zero-downtime lazy read fallback (`legacyCredits * 0.04`) plus an idempotent batch migration script. Update billing plans (1:1 USD monthly reset), top-up packs (1:1 USD permanent rollover + optional promo bonus), action costs (`$0.15` image, `$0.30` blueprint, `$0.10/s` standard video, `$0.18/s` talking-head video, `$6.00` welcome grant), affiliate FIFO USD lots, all web/API/MCP/i18n surfaces, and the Flutter mobile app.

**Tech Stack:** TypeScript, Next.js 16 (App Router), MongoDB 7, Zod 4, Stripe SDK, Node `node:test` + `tsx`, ESLint 9, Flutter / Dart.

**Spec:** `docs/superpowers/specs/2026-11-19-usd-credit-billing-migration-design.md`

## Global Constraints

- Precision: all USD credit math MUST use integer ten-thousandths of a dollar (`USD_SCALE = 10_000`, i.e., `$0.0001` units) via `src/service/billing/usd.ts` — never raw floating-point subtraction on user balances.
- Legacy conversion rate: `LEGACY_CREDIT_TO_USD_RATE = 0.04` (`1 old credit = $0.04 USD`).
- Monthly plans (1:1 USD monthly reset, unspent `bonusCreditUsd` rolls over permanently): Starter `$59.00`, Pro `$129.00`, Studio `$249.00`, Scale `$399.00`.
- One-time top-up packs (permanent `bonusCreditUsd`): `$10`, `$20`, `$50`, `$100`, `$500`, `$1,000` (with `ADHOC_CREDIT_BONUS_PERCENT` applied to granted USD, default `5%`).
- Action prices: `WELCOME_CREDIT_USD = 6.00`, `IMAGE_COST_USD = 0.15`, `BLUEPRINT_COST_USD = 0.30`, `VIDEO_COST_PER_SECOND_USD = 0.10`, `TALKING_HEAD_COST_PER_SECOND_USD = 0.18`, Scro Swap static `$0.15` / video `$0.15 + $0.10/s`, Teleport `$0.15 + $0.10/s`, Extend (6s) `$0.60`.
- Zero live paid provider calls in tests (no Higgsfield, OpenRouter, Stripe, or Mentalok live API calls).
- Sync `pipeline-models.md` and `AGENTS.md` with updated USD pricing in the same workflow.

---

### Task 1: USD Precision Math & Formatting Core

**Files:**
- Create: `src/service/billing/usd.ts`
- Create: `src/service/billing/usd.test.ts`

**Interfaces:**
- Produces:
  - `USD_SCALE = 10_000`
  - `LEGACY_CREDIT_TO_USD_RATE = 0.04`
  - `toUsdUnits(amount: number): number`
  - `fromUsdUnits(units: number): number`
  - `roundUsd4(amount: number): number`
  - `addUsd(a: number, b: number): number`
  - `subUsd(a: number, b: number): number`
  - `mulUsd(a: number, factor: number): number`
  - `legacyCreditsToUsd(credits: number): number`
  - `formatUsd(amount: number): string`
  - `formatUsdRate(amountPerSecond: number, unit?: string): string`

- [ ] **Step 1: Write the failing test (`src/service/billing/usd.test.ts`)**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addUsd,
  formatUsd,
  formatUsdRate,
  LEGACY_CREDIT_TO_USD_RATE,
  legacyCreditsToUsd,
  mulUsd,
  roundUsd4,
  subUsd,
} from "@/service/billing/usd";

test("USD arithmetic avoids IEEE 754 floating-point drift and preserves 4 decimals", () => {
  assert.equal(addUsd(0.1, 0.2), 0.3);
  assert.equal(subUsd(6.0, 0.15), 5.85);
  assert.equal(subUsd(1.0, 0.0008), 0.9992);
  assert.equal(mulUsd(0.18, 7), 1.26);
  assert.equal(roundUsd4(0.12345), 0.1235);
});

test("legacyCreditsToUsd converts old integer credits at $0.04 each", () => {
  assert.equal(LEGACY_CREDIT_TO_USD_RATE, 0.04);
  assert.equal(legacyCreditsToUsd(145), 5.8);
  assert.equal(legacyCreditsToUsd(4), 0.16);
  assert.equal(legacyCreditsToUsd(-10), 0);
  assert.equal(legacyCreditsToUsd(Number.NaN), 0);
});

test("formatUsd formats standard amounts to 2 decimals and sub-cent amounts up to 4 decimals", () => {
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(59), "$59.00");
  assert.equal(formatUsd(1234.5), "$1,234.50");
  assert.equal(formatUsd(0.15), "$0.15");
  assert.equal(formatUsd(0.0008), "$0.0008");
  assert.equal(formatUsd(0.0012), "$0.0012");
  assert.equal(formatUsd(0.004), "$0.004");
  assert.equal(formatUsd(-0.15), "-$0.15");
});

test("formatUsdRate formats per-second pricing cleanly", () => {
  assert.equal(formatUsdRate(0.1), "$0.10/s");
  assert.equal(formatUsdRate(0.18, "秒"), "$0.18/秒");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/billing/usd.test.ts`
Expected: FAIL with `Cannot find module '@/service/billing/usd'`

- [ ] **Step 3: Implement `src/service/billing/usd.ts`**

```ts
// Precision unit for USD credit balances ($0.0001 = 1 unit).
// Integer arithmetic avoids IEEE 754 drift while supporting sub-cent model pricing (e.g. $0.0008).
export const USD_SCALE = 10_000;

// Conversion rate for migrating pre-USD integer credits to USD credit balances.
export const LEGACY_CREDIT_TO_USD_RATE = 0.04;

export function toUsdUnits(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * USD_SCALE);
}

export function fromUsdUnits(units: number): number {
  if (!Number.isFinite(units)) return 0;
  return units / USD_SCALE;
}

export function roundUsd4(amount: number): number {
  return fromUsdUnits(toUsdUnits(amount));
}

export function addUsd(a: number, b: number): number {
  return fromUsdUnits(toUsdUnits(a) + toUsdUnits(b));
}

export function subUsd(a: number, b: number): number {
  return fromUsdUnits(toUsdUnits(a) - toUsdUnits(b));
}

export function mulUsd(a: number, factor: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(factor)) return 0;
  return roundUsd4(a * factor);
}

export function legacyCreditsToUsd(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  return roundUsd4(credits * LEGACY_CREDIT_TO_USD_RATE);
}

// Formats a USD credit amount: 2 decimals for >= $0.01 or $0.00; up to 4 decimals for sub-cent non-zero prices.
export function formatUsd(amount: number): string {
  const safe = Number.isFinite(amount) ? roundUsd4(amount) : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);
  const sign = negative ? "-" : "";

  if (abs === 0) return "$0.00";
  if (abs < 0.01) {
    const trimmed = abs.toFixed(4).replace(/0+$/, "");
    return `${sign}$${trimmed}`;
  }
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUsdRate(amountPerUnit: number, unit = "s"): string {
  return `${formatUsd(amountPerUnit)}/${unit}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/billing/usd.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add src/service/billing/usd.ts src/service/billing/usd.test.ts
git commit -m "feat(billing): add 4-decimal USD credit precision math and formatter"
```

---

### Task 2: MongoDB Schemas & USD Pricing Catalog (`plans`, `packs`, `credit-costs`, `credit-balance`, `welcome-credits`, `promo`, `unit-economics`)

**Files:**
- Modify: `src/model/user.ts`
- Modify: `src/model/subscription.ts`
- Modify: `src/model/billing-settings.ts`
- Modify: `src/model/affiliate.ts`
- Modify: `src/model/project.ts`
- Modify: `src/model/jutsu-job.ts`
- Modify: `src/model/teleport-job.ts`
- Modify: `src/model/extend-job.ts`
- Modify: `src/service/billing/welcome-credits.ts`
- Modify: `src/service/billing/credit-balance.ts`
- Modify: `src/service/billing/plans.ts`
- Modify: `src/service/billing/packs.ts`
- Modify: `src/service/billing/promo.ts`
- Modify: `src/service/billing/unit-economics.ts`
- Modify: `src/service/credit-costs.ts`
- Modify: `src/service/production-plan.ts`
- Test: `src/service/billing/credit-balance.test.ts`
- Test: `src/service/billing/credit-pricing.test.ts`
- Test: `src/service/billing/promo.test.ts`
- Test: `src/service/production-plan.test.ts`

**Interfaces:**
- Consumes: `src/service/billing/usd.ts`
- Produces:
  - `AppUser`: `creditUsd?: number`, `bonusCreditUsd?: number`, `creditLimitUsd?: number`, `creditMigratedAt?: Date` (legacy `credits?: number`, `bonusCredits?: number`, `creditLimit?: number` remain optional for migration/read fallback)
  - `resolveUserUsdBalance(user: Pick<AppUser, "creditUsd" | "bonusCreditUsd" | "creditLimitUsd" | "credits" | "bonusCredits" | "creditLimit">): UsdCreditBalance`
  - `UsdCreditBalance = { creditUsd: number; bonusCreditUsd: number; creditLimitUsd: number }`
  - `applyMonthlyRefillUsd({ monthlyCreditUsd, bonusCreditUsd }): UsdCreditBalance`
  - `applySpendUsd(state, costUsd): UsdCreditBalance`
  - `applyPackPurchaseUsd(state, packCreditUsd): UsdCreditBalance`
  - `creditProgressUsd(creditUsd, creditLimitUsd)` / `creditsUsedUsd(creditUsd, creditLimitUsd)`
  - `WELCOME_CREDIT_USD = 6.0`
  - `IMAGE_COST_USD = 0.15`, `FRAME_COST_USD = 0.15`, `FRAMES_COST_USD = 0.30`, `BLUEPRINT_COST_USD = 0.30`, `VIDEO_COST_PER_SECOND_USD = 0.10`, `TALKING_HEAD_COST_PER_SECOND_USD = 0.18`, `MIN_VIDEO_COST_USD = 0.50`
  - `videoCostUsd(...)`, `talkingHeadVideoCostUsd(...)`, `scroSwapCostUsd(...)`, `teleportCostUsd(...)`, `chargedClipUsd(...)`, `needsVideoUpgradeUsd(creditUsd, costUsd)`
  - `PLANS[id].monthlyCreditUsd` (`59`, `129`, `249`, `399`), `CREDIT_PACKS[id].creditUsd` (`10`, `20`, `50`, `100`, `500`, `1000`), `packCreditUsdWithBonus(baseCreditUsd, percent)`

- [ ] **Step 1: Update unit tests first (`credit-balance.test.ts`, `credit-pricing.test.ts`, `promo.test.ts`, `production-plan.test.ts`) to assert the new USD catalog & balance semantics**

Update `src/service/billing/credit-balance.test.ts`:
```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyMonthlyRefillUsd,
  applyPackPurchaseUsd,
  applySpendUsd,
  creditProgressUsd,
  creditsUsedUsd,
  resolveUserUsdBalance,
} from "@/service/billing/credit-balance";

test("monthly refill resets monthly USD allowance while keeping leftover bonus pack USD", () => {
  const next = applyMonthlyRefillUsd({ monthlyCreditUsd: 59, bonusCreditUsd: 10.5 });
  assert.deepEqual(next, {
    creditUsd: 69.5,
    bonusCreditUsd: 10.5,
    creditLimitUsd: 69.5,
  });
});

test("spend consumes monthly USD first before touching bonusCreditUsd without floating-point drift", () => {
  const afterMonthly = applySpendUsd(
    { creditUsd: 69.5, bonusCreditUsd: 10.5, creditLimitUsd: 69.5 },
    0.15,
  );
  assert.deepEqual(afterMonthly, {
    creditUsd: 69.35,
    bonusCreditUsd: 10.5,
    creditLimitUsd: 69.5,
  });

  const afterBonus = applySpendUsd(
    { creditUsd: 69.5, bonusCreditUsd: 10.5, creditLimitUsd: 69.5 },
    65,
  );
  assert.deepEqual(afterBonus, {
    creditUsd: 4.5,
    bonusCreditUsd: 4.5,
    creditLimitUsd: 69.5,
  });
});

test("pack purchase adds to remaining and bonusCreditUsd and raises period limit", () => {
  const next = applyPackPurchaseUsd(
    { creditUsd: 5.85, bonusCreditUsd: 0, creditLimitUsd: 6 },
    10.5,
  );
  assert.deepEqual(next, {
    creditUsd: 16.35,
    bonusCreditUsd: 10.5,
    creditLimitUsd: 16.5,
  });
});

test("resolveUserUsdBalance reads canonical USD fields and lazily falls back from legacy integer credits", () => {
  assert.deepEqual(
    resolveUserUsdBalance({ creditUsd: 12.34, bonusCreditUsd: 2.5, creditLimitUsd: 59, credits: 9999 }),
    { creditUsd: 12.34, bonusCreditUsd: 2.5, creditLimitUsd: 59 },
  );
  assert.deepEqual(
    resolveUserUsdBalance({ credits: 145, bonusCredits: 25, creditLimit: 200 }),
    { creditUsd: 5.8, bonusCreditUsd: 1, creditLimitUsd: 8 },
  );
});

test("progress and used USD ratios compute accurately", () => {
  assert.deepEqual(creditProgressUsd(29.5, 59), { remaining: 29.5, limit: 59, ratio: 0.5 });
  assert.deepEqual(creditsUsedUsd(58.85, 59), { used: 0.15, remaining: 58.85, limit: 59, ratio: 0.15 / 59 });
});
```

Update `src/service/billing/credit-pricing.test.ts` and `src/service/billing/promo.test.ts` to assert:
- `PLANS.{starter,pro,studio,scale}.monthlyCreditUsd` = `59`, `129`, `249`, `399`
- `CREDIT_PACKS.{pack10..pack1000}.creditUsd` = `10`, `20`, `50`, `100`, `500`, `1000`
- `packCreditUsdWithBonus(10, 5)` = `10.5`, `packCreditUsdWithBonus(100, 5)` = `105`
- `IMAGE_COST_USD` = `0.15`, `BLUEPRINT_COST_USD` = `0.3`, `VIDEO_COST_PER_SECOND_USD` = `0.1`, `TALKING_HEAD_COST_PER_SECOND_USD` = `0.18`, `MIN_VIDEO_COST_USD` = `0.5`, `WELCOME_CREDIT_USD` = `6`
- `scroSwapCostUsd({ mediaKind: "image" })` = `0.15`, `scroSwapCostUsd({ mediaKind: "video", durationSeconds: 6 })` = `0.75`, `teleportCostUsd({ durationSeconds: 6 })` = `0.75`
- `packPriceIsCurrent` checks `creditUsd` and `packProductName` outputs `"Scro $50 儲值包 ($50.00 USD)"`

- [ ] **Step 2: Run pricing & balance tests to verify they fail**

Run: `npx tsx --test src/service/billing/credit-balance.test.ts src/service/billing/credit-pricing.test.ts src/service/billing/promo.test.ts`
Expected: FAIL (new exports do not exist yet)

- [ ] **Step 3: Update MongoDB model definitions**

Update:
- `src/model/user.ts`: make `credits?: number` optional; add `creditUsd?: number`, `bonusCreditUsd?: number`, `creditLimitUsd?: number`, `creditMigratedAt?: Date` in both `AppUser` and `appUserSchema`.
- `src/model/subscription.ts`: add `monthlyCreditUsd?: number`; make `monthlyCredits?: number` optional.
- `src/model/billing-settings.ts`: add `creditUsd?: number` to `CreditPackPrice` and `creditPackPriceSchema`.
- `src/model/affiliate.ts`: add `creditUsd?: number`, `cashCentsPerUsd?: number` to `AffiliateLedgerEntry`; add `creditUsdRemaining?: number`, `creditUsdOriginal?: number`, `cashCentsPerUsd?: number` to `CreditLot` (keep legacy fields optional for unmigrated documents).
- `src/model/project.ts`, `src/model/jutsu-job.ts`, `src/model/teleport-job.ts`, `src/model/extend-job.ts`: add `chargedUsd?: number` alongside optional legacy `creditsCharged?: number`.

- [ ] **Step 4: Implement USD billing catalog & pure calculation modules**

Implement:
- `src/service/billing/welcome-credits.ts`: export `WELCOME_CREDIT_USD = 6.0`.
- `src/service/billing/credit-balance.ts`: implement `resolveUserUsdBalance`, `applyMonthlyRefillUsd`, `applySpendUsd`, `applyPackPurchaseUsd`, `creditProgressUsd`, `creditsUsedUsd` using `addUsd`/`subUsd`/`roundUsd4`/`legacyCreditsToUsd`.
- `src/service/billing/plans.ts`: replace `monthlyCredits` with `monthlyCreditUsd` (`59`, `129`, `249`, `399`), update `ENTERPRISE.blurb` to mention USD credit, and update `planMarginPct`.
- `src/service/billing/packs.ts`: replace `credits` with `creditUsd` (`10`, `20`, `50`, `100`, `500`, `1000`), update `localizedPackBlurb`, `packProductName`, and `packPriceIsCurrent` to use `formatUsd(pack.creditUsd)`.
- `src/service/billing/promo.ts`: implement `packCreditUsdWithBonus(baseCreditUsd: number, percent: number): number` using `roundUsd4((baseCreditUsd * (100 + percent)) / 100)`.
- `src/service/credit-costs.ts` & `src/service/production-plan.ts`: implement `IMAGE_COST_USD = 0.15`, `FRAME_COST_USD = 0.15`, `FRAMES_COST_USD = 0.30`, `BLUEPRINT_COST_USD = 0.30`, `VIDEO_COST_PER_SECOND_USD = 0.10`, `TALKING_HEAD_COST_PER_SECOND_USD = 0.18`, `MIN_VIDEO_COST_USD = 0.50`, `videoCostUsd`, `talkingHeadVideoCostUsd`, `scroSwapCostUsd`, `teleportCostUsd`, `chargedClipUsd`, `needsVideoUpgradeUsd`.
- `src/service/billing/unit-economics.ts`: update `typicalCogsUsd` and `typicalGrossMargin` to compute COGS/margin directly per USD of credit granted.

- [ ] **Step 5: Run tests to verify Task 2 passes**

Run: `npx tsx --test src/service/billing/usd.test.ts src/service/billing/credit-balance.test.ts src/service/billing/credit-pricing.test.ts src/service/billing/promo.test.ts src/service/production-plan.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/model/ src/service/billing/ src/service/credit-costs.ts src/service/production-plan.ts src/service/production-plan.test.ts
git commit -m "feat(billing): migrate schemas, plans, packs, and action pricing to USD credit"
```

---

### Task 3: Wallet Engine, Auth Signup, Stripe Sync, Affiliate FIFO & Migration Script

**Files:**
- Modify: `src/service/billing/credits.ts`
- Modify: `src/service/billing/credit-gate.ts`
- Modify: `src/service/billing/unlimited-credits.ts`
- Modify: `src/service/billing/welcome-guard.ts`
- Modify: `src/service/billing/stripe.ts`
- Modify: `src/service/billing/sync-subscription.ts`
- Modify: `src/service/billing/actions.ts`
- Modify: `src/service/auth.ts`
- Modify: `src/service/affiliate/lots.ts`
- Modify: `src/service/affiliate/engine.ts`
- Modify: `src/service/notify/operator-notice.ts`
- Modify: `src/service/notify/operator-email.ts`
- Modify: `src/service/notify/welcome-credit-upgrade-email.ts`
- Create: `scripts/migrate-credits-to-usd.ts`
- Modify: `package.json` (add `"migrate:usd-credits": "tsx scripts/migrate-credits-to-usd.ts"`)
- Test: `src/service/billing/credit-gate.test.ts`
- Test: `src/service/billing/unlimited-credits.test.ts`
- Test: `src/service/billing/welcome-guard.test.ts`
- Test: `src/service/affiliate/affiliate.test.ts`

**Interfaces:**
- Consumes: Task 1 (`usd.ts`) + Task 2 (`credit-balance.ts`, `plans.ts`, `packs.ts`, `credit-costs.ts`)
- Produces:
  - `consumeCreditUsd(clerkUserId: string, costUsd: number): Promise<string>` (with optimistic concurrency retry up to 2 attempts + lazy migration on first write)
  - `refundCreditUsd(clerkUserId: string, costUsd: number, spendEventKey?: string): Promise<void>`
  - `resetMonthlyCreditUsd(clerkUserId: string, monthlyCreditUsd: number): Promise<void>`
  - `grantPackCreditUsd(clerkUserId: string, packCreditUsd: number, checkoutId: string): Promise<void>`
  - `assertCanSpendCreditUsd(user: AppUser, costUsd: number): Promise<Subscription | null>`
  - `evaluateCreditSpendGate({ email, creditUsd, costUsd, sub })`
  - `getCreditSnapshotAction(): Promise<CreditSnapshotResult>` returning `{ ok: true, creditUsd, creditLimitUsd, subscribed, planId }`
  - `planFifoSpendUsd(lots, spendUsd)` and `cashCentsPerUsd(amountPaidCents, creditUsd)`

- [ ] **Step 1: Update unit tests (`credit-gate.test.ts`, `unlimited-credits.test.ts`, `welcome-guard.test.ts`, `affiliate.test.ts`) to expect USD wallet operations, `$6.00` welcome grant, and USD FIFO affiliate lots**

Update `src/service/billing/credit-gate.test.ts` to assert:
- `isCreditGateError("USD Credit 餘額不足，請加值或升級方案") === true`
- `isCreditGateError("USD Credit 餘額不足，無法扣款") === true`
- `creditGrantLanded({ creditUsd: 0.5, subscribed: true }, { creditUsd: 11.0, subscribed: true }) === true`
- `evaluateCreditSpendGate` allows `creditUsd: WELCOME_CREDIT_USD` (`6.0`) against `FRAMES_COST_USD` (`0.30`), `FRAME_COST_USD` (`0.15`), `MIN_VIDEO_COST_USD` (`0.50`) and throws `"請先訂閱方案才能產片"` when unsubscribed with `creditUsd: 0.20` vs `0.50`, or `"USD Credit 餘額不足，請加值或升級方案"` when subscribed with `creditUsd: 0.10` vs `0.15`.
- `assertFreeTrialClipAllowed` allows `bonusCreditUsd: 10.5` on Clip 2 and throws `/加值 USD Credit 或訂閱方案/` otherwise.

Update `src/service/affiliate/affiliate.test.ts` to test `planFifoSpendUsd` with `$59.00` discounted at 85% (`cashCentsPerUsd = 85`) and `$10.50` adhoc bonus pack (`cashCentsPerUsd = 1000 / 10.5`), verifying exact commission cents and reversal.

- [ ] **Step 2: Run Task 3 tests to verify they fail**

Run: `npx tsx --test src/service/billing/credit-gate.test.ts src/service/billing/unlimited-credits.test.ts src/service/billing/welcome-guard.test.ts src/service/affiliate/affiliate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement wallet, auth, Stripe sync, welcome guard & affiliate updates**

Key implementation details:
- `src/service/billing/credits.ts`:
  - `consumeCreditUsd(clerkUserId, costUsd)`: normalize `cost = roundUsd4(costUsd)`. Load user, resolve balance via `resolveUserUsdBalance(user)`. Check `hasUnlimitedCredits(user.email)` first. Compare `toUsdUnits(balance.creditUsd) < toUsdUnits(cost)` → throw `"USD Credit 餘額不足，無法扣款"`. Compute `next = applySpendUsd(balance, cost)`. Atomic optimistic filter: if `typeof user.creditUsd === "number"`, filter `{ clerkUserId, creditUsd: user.creditUsd }`; else filter `{ clerkUserId, creditUsd: { $exists: false }, credits: user.credits }` and also `$set: { creditMigratedAt: now }`. Retry up to 2 times if `modifiedCount !== 1`. Record affiliate consume commission in USD.
  - `refundCreditUsd(clerkUserId, costUsd, spendEventKey)`: load user, resolve balance, write `creditUsd: addUsd(balance.creditUsd, cost)` atomically (with retry up to 2 times) and reverse affiliate commission.
  - `resetMonthlyCreditUsd` / `grantPackCreditUsd`: resolve balance via `resolveUserUsdBalance`, write `{ creditUsd, bonusCreditUsd, creditLimitUsd, creditMigratedAt: now, updatedAt: now }`.
- `src/service/billing/unlimited-credits.ts`: set `creditUsd: 1_000_000`, `creditLimitUsd: 1_000_000` (keep `credits` untouched).
- `src/service/billing/welcome-guard.ts`: return `{ creditUsd: WELCOME_CREDIT_USD, granted: true, normalizedEmail }` or `{ creditUsd: 0, granted: false, ... }`.
- `src/service/auth.ts`: on new user `$setOnInsert`, write `{ clerkUserId: uid, creditUsd: grant.creditUsd, bonusCreditUsd: 0, creditLimitUsd: grant.creditUsd, creditMigratedAt: now, createdAt: now }`.
- `src/service/billing/stripe.ts`, `sync-subscription.ts`, `actions.ts`: write `creditUsd` / `monthlyCreditUsd` metadata and checkout messages (e.g. `"This pack adds $10.50 USD Credit, including the extra bonus."`).
- `src/service/affiliate/lots.ts` & `engine.ts`: implement `cashCentsPerUsd(amountPaidCents, creditUsd)` and `planFifoSpendUsd`, resolving legacy lots via `legacyCreditsToUsd` when `creditUsdRemaining === undefined`.

- [ ] **Step 4: Create idempotent migration script `scripts/migrate-credits-to-usd.ts` and register in `package.json`**

Script logic:
- Uses `loadEnvConfig(process.cwd())` and `getDb()`.
- Parses `--dry-run` flag.
- Migrates `users` where `creditUsd: { $exists: false }`, `subscriptions` where `monthlyCreditUsd: { $exists: false }`, and `affiliate_lots` where `creditUsdRemaining: { $exists: false }`.
- Logs summary counts (`users`, `subscriptions`, `affiliate_lots`) and exits cleanly.

- [ ] **Step 5: Run Task 3 tests to verify they pass**

Run: `npx tsx --test src/service/billing/credit-gate.test.ts src/service/billing/unlimited-credits.test.ts src/service/billing/welcome-guard.test.ts src/service/affiliate/affiliate.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/service/billing/ src/service/auth.ts src/service/affiliate/ src/service/notify/ scripts/migrate-credits-to-usd.ts package.json
git commit -m "feat(billing): implement USD credit wallet, Stripe sync, affiliate FIFO, and migration script"
```

---

### Task 4: Migrate All Generation Pipelines & Service Call Sites (`src/service/**`)

**Files:**
- Modify: `src/service/higgsfield/pipeline.ts`
- Modify: `src/service/higgsfield/video-locks-pipeline.ts`
- Modify: `src/service/higgsfield/subtitle-plate-job.ts`
- Modify: `src/service/clip/production.ts`
- Modify: `src/service/clip/auto-video.ts`
- Modify: `src/service/clip/append-simple-clip.ts`
- Modify: `src/service/clip/clip-timeline-actions.ts`
- Modify: `src/service/clip/frame-prompt-chat-actions.ts`
- Modify: `src/service/clip/enqueue-scene-images.ts`
- Modify: `src/service/clip/cancel-pending-video.ts`
- Modify: `src/service/clip/clip-order.ts`
- Modify: `src/service/clip-stage.ts`
- Modify: `src/service/project/actions.ts`
- Modify: `src/service/project/restart.ts`
- Modify: `src/service/project/restart-cancel.ts`
- Modify: `src/service/character/actions.ts`
- Modify: `src/service/character/life.ts`
- Modify: `src/service/character/sync.ts`
- Modify: `src/service/character/starter-cast.ts`
- Modify: `src/service/jutsu/pipeline.ts`
- Modify: `src/service/teleport/pipeline.ts`
- Modify: `src/service/extend/pipeline.ts`
- Modify: `src/service/post/pipeline.ts`
- Modify: `src/service/pose-edit/create.ts`
- Modify: `src/service/pose-edit/sync.ts`
- Modify: `src/service/pose-edit/errors.ts`
- Modify: `src/service/opencut/on-screen-text.ts`
- Modify: `src/service/opencut/standalone-engine-video.ts`
- Modify: `src/service/product/actions.ts`
- Modify: `src/service/product/sync.ts`
- Modify: `src/service/style/user-style-actions.ts`
- Modify: `src/service/style/user-style-preview.ts`
- Modify: `src/service/director/director-actions.ts`
- Modify: `src/service/director/director-preview.ts`
- Modify: `src/service/director/talking-head.ts`
- Modify: `src/service/text-style/actions.ts`
- Modify: `src/service/text-style/preview.ts`
- Modify: `src/service/video-edit/reel-cover.ts`
- Modify: `src/service/generation/actions.ts`
- Modify: `src/service/analytics/user-creations.ts`
- Modify: `src/service/analytics/ux-diagnostics.ts`
- Modify: `src/service/analytics/ux-classifier.ts`
- Test: all matching `*.test.ts` files in `src/service/**`

**Interfaces:**
- Consumes: Task 2 (`IMAGE_COST_USD`, `BLUEPRINT_COST_USD`, `videoCostUsd`, `talkingHeadVideoCostUsd`, `scroSwapCostUsd`, `teleportCostUsd`, `chargedClipUsd`) + Task 3 (`assertCanSpendCreditUsd`, `consumeCreditUsd`, `refundCreditUsd`, `resolveUserUsdBalance`)
- Produces: Every service action charges/refunds exact USD amounts, records `chargedUsd` on clips/jobs, and returns USD cost metadata where applicable.

- [ ] **Step 1: Update all service unit tests (`src/service/**/*.test.ts`) to assert USD spend/refund values**

Update assertions in `clip-context.test.ts`, `clip-stage.test.ts`, `clip-order.test.ts`, `higgsfield/video-locks-pipeline.test.ts`, `higgsfield/scene-character-lock.test.ts`, `character/life.test.ts`, `pose-edit/create.test.ts`, `jutsu/jutsu.test.ts`, `project/actions.test.ts`, `project/restart.test.ts`, `analytics/ux-classifier.test.ts`.

- [ ] **Step 2: Run service tests to verify failures before migration**

Run: `npx tsx --test 'src/service/**/*.test.ts'`
Expected: FAIL on updated USD expectations

- [ ] **Step 3: Migrate every pipeline & service action from integer credits to USD credit calls**

Systematically replace:
- `assertCanSpendCredits` → `assertCanSpendCreditUsd`
- `consumeCredits` → `consumeCreditUsd`
- `refundCredits` → `refundCreditUsd`
- `FRAME_COST` → `IMAGE_COST_USD` (`0.15`), `FRAMES_COST` / `BLUEPRINT_COST` → `BLUEPRINT_COST_USD` (`0.30`)
- `videoCost(...)` → `videoCostUsd(...)`, `talkingHeadVideoCost(...)` → `talkingHeadVideoCostUsd(...)`
- `scroSwapCost(...)` → `scroSwapCostUsd(...)`, `teleportCost(...)` → `teleportCostUsd(...)`
- `chargedVideoCredits(clip)` → `chargedClipUsd(clip)`
- Store `chargedUsd` when creating/charging clips, `jutsu_jobs`, `teleport_jobs`, `extend_jobs`, `pose_edits`, `posts`, `products`, `characters`, `user_styles`.
- Refund fallbacks: read `doc.chargedUsd ?? (doc.creditsCharged !== undefined ? legacyCreditsToUsd(doc.creditsCharged) : defaultUsd)`.

- [ ] **Step 4: Run all service unit tests**

Run: `npx tsx --test 'src/service/**/*.test.ts'`
Expected: PASS (100% of service tests green)

- [ ] **Step 5: Commit**

```bash
git add src/service/
git commit -m "feat(service): migrate all generation pipelines and actions to USD credit billing"
```

---

### Task 5: REST API (`/api/v1/*`), Serializers, MCP Server & API Docs

**Files:**
- Modify: `src/presentation/serialize.ts`
- Modify: `src/presentation/serialize-folder.test.ts`
- Modify: `src/presentation/api/v1/me/route.ts`
- Modify: `src/presentation/api/v1/billing/route.ts`
- Modify: `src/presentation/api/v1/pickers/route.ts`
- Modify: `src/presentation/api/v1/characters/route.ts`
- Modify: `src/presentation/api/v1/directors/route.ts`
- Modify: `src/presentation/api/v1/directors/[id]/route.ts`
- Modify: `src/presentation/api/v1/styles/route.ts`
- Modify: `src/presentation/api/v1/styles/[id]/route.ts`
- Modify: `src/presentation/api/v1/products/route.ts`
- Modify: `src/presentation/api/v1/folders/route.ts`
- Modify: `src/presentation/api/llms/route.ts`
- Modify: `src/service/api/generation-docs.ts`
- Modify: `src/service/api/generation-docs.test.ts`
- Modify: `src/service/mcp/server.ts`
- Modify: `src/service/mcp/wrap-tool.ts`
- Modify: `src/service/mcp/generation-tools.ts`
- Modify: `src/service/mcp/character-tools.ts`
- Modify: `src/service/mcp/life-tools.ts`
- Modify: `src/service/mcp/wardrobe-tools.ts`
- Modify: `src/service/mcp/apply-wardrobe.ts`
- Modify: `src/service/mcp/brief-tools.ts`
- Modify: `src/service/mcp/reel-edit-tools.ts`
- Modify: `src/service/mcp/video-approval.ts`
- Modify: `src/service/mcp/video-brief.ts`
- Modify: `src/service/mcp/key-actions.ts`
- Modify: `src/service/mcp/api-keys.ts`
- Modify: `src/model/mcp.ts`

**Interfaces:**
- Produces:
  - `GET /api/v1/me` → `{ user: { ..., creditUsd, creditLimitUsd, bonusCreditUsd }, subscription: { ..., monthlyCreditUsd }, subscribed, activeTasks }`
  - `GET /api/v1/billing` → `{ creditUsd, creditLimitUsd, bonusCreditUsd, monthlyCreditUsd, subscribed, activePlanId, subscription, plans: [{ ..., monthlyCreditUsd, amountUsd }], packs: [{ id, creditUsd, amountUsd, nameZh, blurb }], hasPaymentProfile }`
  - MCP tool responses & `generation-docs.ts` use `creditUsd` / `costUsd` exclusively.

- [ ] **Step 1: Update API & serializer tests (`src/service/api/generation-docs.test.ts`, `src/presentation/serialize-folder.test.ts`)**

Verify docs reference USD prices (`$0.15`, `$0.10/s`, `$0.18/s`) and serialized DTOs emit `creditUsd` / `monthlyCreditUsd` instead of legacy integer credits.

- [ ] **Step 2: Run tests to verify failure**

Run: `npx tsx --test src/service/api/generation-docs.test.ts src/presentation/serialize-folder.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement REST API, serializer, MCP & docs updates**

Update every route handler and MCP tool to read `resolveUserUsdBalance(user)` and emit `creditUsd` / `creditLimitUsd` / `bonusCreditUsd` / `monthlyCreditUsd` / `costUsd`. Update MCP tool descriptions and `llms.txt` copy to describe USD Credit balances and per-action USD pricing.

- [ ] **Step 4: Run tests and verify pass**

Run: `npx tsx --test src/service/api/generation-docs.test.ts src/presentation/serialize-folder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/presentation/serialize.ts src/presentation/serialize-folder.test.ts src/presentation/api/ src/service/api/ src/service/mcp/ src/model/mcp.ts
git commit -m "feat(api,mcp): expose USD credit balances and costs across REST API and MCP"
```

---

### Task 6: Logged-In App UI (Shell, Billing/Usage/Dialogs & Workspace Cost Badges)

**Files:**
- Modify: `src/app/app/layout.tsx`
- Modify: `src/app/app/page.tsx`
- Modify: `src/app/app/billing/page.tsx`
- Modify: `src/app/app/usage/page.tsx`
- Modify: `src/app/app/life/page.tsx`
- Modify: `src/app/app/characters/page.tsx`
- Modify: `src/app/app/characters/generate/page.tsx`
- Modify: `src/app/app/products/page.tsx`
- Modify: `src/app/app/room/load-room-data.ts`
- Modify: `src/app/app/directors/[id]/page.tsx`
- Modify: `src/app/app/text-styles/[id]/page.tsx`
- Modify: `src/app/app/videos/new/page.tsx`
- Modify: `src/app/app/videos/[videoId]/page.tsx`
- Modify: `src/app/app/projects/[id]/videos/new/page.tsx`
- Modify: `src/app/app/projects/[id]/videos/[videoId]/page.tsx`
- Modify: `src/app/scroadmin/analytics/user-creations-dialog.tsx`
- Modify: `src/app/scroadmin/analytics/ux-analytics-dashboard.tsx`
- Modify: `src/presentation/components/app-shell.tsx`
- Modify: `src/presentation/components/auth/signed-in-account.tsx`
- Modify: `src/presentation/components/auth/avatar-credit-ring.tsx`
- Modify: `src/presentation/components/signup-promo-banner.tsx`
- Modify: `src/presentation/studio/use-credit-snapshot.ts`
- Modify: `src/presentation/components/app/billing/*` (`usage-view.tsx`, `billing-view.tsx`, `billing-plan-card.tsx`, `buy-credits-section.tsx`, `add-credit-modal.tsx`, `insufficient-credits-dialog.tsx`, `credits-tiers-overview.tsx`, `credit-offer-cards.tsx`, `invoices-view.tsx`, `credits-changed.ts`)
- Modify: `src/presentation/components/app/projects/new/paid-action.ts`
- Modify: `src/presentation/components/app/projects/new/paid-action.test.ts`
- Modify: all workspace components referencing credits (`home-view.tsx`, `home-influencer-create-form.tsx`, `dashboard-view.tsx`, `use-case-video-list-page.tsx`, `life/*`, `posts/*`, `simple/*`, `room/*`, `characters/*`, `directors/*`, `styles/*`, `text-styles/*`, `mcp/*`, `projects/**`, `project/**`, `presentation/actions/opencut-subtitle.ts`)

**Interfaces:**
- Consumes: `formatUsd`, `formatUsdRate`, `resolveUserUsdBalance`, `getCreditSnapshotAction` (`creditUsd`, `creditLimitUsd`)
- Produces: Every logged-in screen displays remaining USD Credit (`$59.00`) and USD action costs (`$0.15`, `$0.30`, `$0.10/s`, `$0.18/s`).

- [ ] **Step 1: Update `paid-action.test.ts` for USD credit gate errors**

Run: `npx tsx --test src/presentation/components/app/projects/new/paid-action.test.ts`
Expected: FAIL before updating `paid-action.ts`

- [ ] **Step 2: Update AppShell, Account Footer, Credit Ring, Billing/Usage Views & Dialogs**

- Pass `creditUsd` and `creditLimitUsd` from `src/app/app/layout.tsx` → `AppShell` → `SignedInAccount` → `AvatarCreditRing`.
- Display `formatUsd(creditUsd)` remaining (e.g. `$59.00`) with progress ring ratio `creditsUsedUsd(creditUsd, creditLimitUsd)`.
- Update `UsageView`, `BillingView`, `BillingPlanCard`, `BuyCreditsSection`, `AddCreditModal`, `InsufficientCreditsDialog`, `CreditsTiersOverview`, `CreditOfferCards`, `SignupPromoBanner` to display `$59.00/月` monthly USD credit refill, `$10.00` (+bonus `$10.50`) packs, and `$6.00` welcome USD credit.

- [ ] **Step 3: Update all workspace cost labels & Admin Analytics views**

Replace every integer credit badge (`4 credits`, `8 credits`, `2 credits/s`, `4 credits/s`) across Home, Brief, Storyboard, OpenEdit, Simple, Swap, Teleport, Life, Poster, Room, Characters, Products, Styles, Directors, Text Styles, MCP, and Admin Analytics with `formatUsd(...)` / `formatUsdRate(...)`.

- [ ] **Step 4: Run `paid-action.test.ts` and TypeScript typecheck**

Run: `npx tsx --test src/presentation/components/app/projects/new/paid-action.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/app/ src/app/scroadmin/ src/presentation/components/ src/presentation/studio/ src/presentation/actions/
git commit -m "feat(ui): migrate app shell, billing screens, and workspace cost labels to USD credit"
```

---

### Task 7: Public Marketing Website, Legal, All i18n Dictionaries & Canonical Docs Sync

**Files:**
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/app/pricing/pricing-plans.tsx`
- Modify: `src/app/pricing/pricing-plan-card.tsx`
- Modify: `src/app/pricing/pricing-enterprise.tsx`
- Modify: `src/presentation/components/economy/public-studio-creation-hub.tsx`
- Modify: `src/presentation/components/studio-powertools-band.tsx`
- Modify: `src/presentation/components/site-header.tsx`
- Modify: `src/presentation/components/legal/terms-document.tsx`
- Modify: `src/presentation/components/legal/policy-layout.tsx`
- Modify: `src/app/terms/page.tsx`
- Modify: `src/app/posts/[slug]/blog-post-register-cta.tsx`
- Modify: `src/service/academy/catalog/lessons.ts`
- Modify: `src/service/academy/courses.ts`
- Modify: `src/util/i18n/messages/**` (all locales: `zh-Hant.ts`, `zh-Hans.ts`, `en.ts`, `ja.ts`, `ko.ts`, `es.ts`, `fr.ts`, `de.ts`, `pt.ts`, `ru.ts`, `id.ts`, `director-locale.ts`, `types.ts`, and `workspace/*.ts`)
- Modify: `pipeline-models.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `PLANS`, `CREDIT_PACKS`, `WELCOME_CREDIT_USD`, `formatUsd`
- Produces: 100% consistent USD Credit messaging across the entire public website, all 11 locales, legal pages, and canonical docs.

- [ ] **Step 1: Update public pricing, economy, landing, legal & academy pages**

Replace every mention of integer credits on `/pricing`, `/economy`, `/terms`, landing components, blog CTA, and academy lessons with 1:1 USD Credit (`$59.00/mo USD Credit`, `$10–$1,000 USD Credit packs`, `$0.15/image`, `$0.10/s video`, `$0.18/s talking-head`, `$6.00` welcome USD credit).

- [ ] **Step 2: Update all i18n message dictionaries (`src/util/i18n/messages/**`)**

Scan every file in `src/util/i18n/messages/` and replace integer `credits` / `點數` copy with `USD Credit` / `$` format placeholders across all 11 languages.

- [ ] **Step 3: Sync `pipeline-models.md` and `AGENTS.md`**

Update every `4 credits`, `2 credits/s`, `4 credits/s` reference in `pipeline-models.md` and `AGENTS.md` to `$0.15`, `$0.10/s`, and `$0.18/s` (USD Credit).

- [ ] **Step 4: Run full `explainer-web` verification suite & residual audit**

Run:
1. `npx tsc --noEmit`
2. `npx tsx --test 'src/**/*.test.ts'`
3. `npx eslint src/`
4. Residual audit: search `src/` for `\b(1641|3333|5938|8723|145 credits|4 credits|8 credits|2 credits/s|4 credits/s)\b` and verify 0 user-facing legacy credit remnants.

Expected: All typechecks, unit tests, lint checks pass with 0 errors and 0 legacy UI credit strings.

- [ ] **Step 5: Commit**

```bash
git add src/app/ src/presentation/ src/service/academy/ src/util/i18n/ pipeline-models.md AGENTS.md
git commit -m "feat(web,i18n,docs): update public website, all locales, and docs to USD credit"
```

---

### Task 8: Flutter Mobile Client (`explainer-app`) Migration to USD Credit

**Files (in `/Users/jefflee/Projects/Explainer.io/explainer-app`):**
- Create: `lib/core/format/usd_format.dart`
- Create: `test/usd_format_test.dart`
- Modify: `lib/models/me.dart`
- Modify: `lib/models/billing.dart`
- Modify: `lib/models/pickers.dart`
- Modify: `lib/models/mcp.dart`
- Modify: `lib/models/character.dart`
- Modify: `lib/models/folder.dart`
- Modify: `lib/core/state/session_providers.dart`
- Modify: `lib/core/network/api_exception.dart`
- Modify: `lib/features/shell/account_footer.dart`
- Modify: `lib/features/shell/credit_ring.dart`
- Modify: `lib/features/shell/nav_items.dart`
- Modify: `lib/features/billing/billing_page.dart`
- Modify: `lib/features/billing/wallet_card.dart`
- Modify: `lib/features/billing/plan_card.dart`
- Modify: `lib/features/billing/pack_card.dart`
- Modify: `lib/common/widgets/credit_dialogs.dart`
- Modify: `lib/features/life/life_page.dart`
- Modify: `lib/features/folder/folder_page.dart`
- Modify: `lib/features/mcp/usage_card.dart`
- Modify: `lib/features/characters/*`, `lib/features/products/*`, `lib/features/styles/*`, `lib/features/directors/*`, `lib/features/video/**`
- Modify: `lib/core/i18n/strings_zh_hant.dart`
- Modify: `lib/core/i18n/strings_en.dart`

**Interfaces:**
- Consumes: Task 5 REST API (`/api/v1/me`, `/api/v1/billing`, `/api/v1/pickers`)
- Produces: Flutter app parses `creditUsd` / `creditLimitUsd` / `bonusCreditUsd` / `monthlyCreditUsd` / `costUsd` as `double` and renders `$XX.XX` consistently with web.

- [ ] **Step 1: Write failing Dart unit test (`test/usd_format_test.dart`)**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:explainer_app/core/format/usd_format.dart';

void main() {
  test('formatUsd formats standard and sub-cent USD values cleanly', () {
    expect(formatUsd(0), '\$0.00');
    expect(formatUsd(59), '\$59.00');
    expect(formatUsd(1234.5), '\$1,234.50');
    expect(formatUsd(0.15), '\$0.15');
    expect(formatUsd(0.0008), '\$0.0008');
  });
}
```

- [ ] **Step 2: Run Flutter test to verify it fails**

Run: `flutter test test/usd_format_test.dart`
Expected: FAIL (file does not exist)

- [ ] **Step 3: Implement `lib/core/format/usd_format.dart` and migrate all Dart models, widgets & i18n strings**

- Implement `formatUsd(num amount)` and `formatUsdRate(num amount, [String unit = 's'])`.
- Switch `Me`, `SubscriptionInfo`, `Plan`, `CreditPack`, `BillingOverview`, `Pickers`, `Mcp` models from `int credits` / `integer(...)` to `double creditUsd` / `real(...)`.
- Update `account_footer.dart`, `credit_ring.dart`, `wallet_card.dart`, `plan_card.dart`, `pack_card.dart`, `credit_dialogs.dart`, and all editor/creation cost displays and i18n strings.

- [ ] **Step 4: Verify Flutter analyzer and tests pass**

Run: `flutter analyze && flutter test`
Expected: PASS (0 analyzer issues, all tests green)

- [ ] **Step 5: Commit in `explainer-app`**

```bash
git add lib/ test/
git commit -m "feat(billing): migrate Flutter client to USD credit balances and pricing"
```
