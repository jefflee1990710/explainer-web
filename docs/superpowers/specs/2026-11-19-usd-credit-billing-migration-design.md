# Sub-project 1 Design Spec: Whole-Site Billing Migration (`Credits` → `USD Credit`)

- **Date**: 2026-11-19
- **Repositories**: `explainer-web` (Next.js App Router + MongoDB + Stripe + MCP) and `explainer-app` (Flutter client)
- **Prerequisite for**: Sub-project 2 (Interactive Node/Canvas Editor below `Home`, integrating OpenRouter and Mentalok AI Studio)

---

## 1. Goal & Scope

Replace Scro's legacy integer `credits` currency across the entire backend, database, Stripe billing flows, affiliate commission engine, REST API (`/api/v1/*`), MCP server, web UI, public marketing/pricing website, i18n copy, documentation, and Flutter mobile app (`explainer-app`) with a transparent **USD Credit Remaining (`creditUsd`)** balance system aligned with Mentalok AI Studio (`https://aistudio.mentalok.io/api/v1/openapi.json`).

### Core Product Rules
1. **1:1 USD Plans & Top-up Packs**:
   - Monthly subscriptions recharge the user's USD credit balance to the plan's full USD value each billing cycle:
     - Starter: `$59/mo` → `$59.00` monthly USD credit
     - Pro: `$129/mo` → `$129.00` monthly USD credit
     - Studio: `$249/mo` → `$249.00` monthly USD credit (highlighted)
     - Scale: `$399/mo` → `$399.00` monthly USD credit
   - One-time top-up packs add permanent USD credit (`bonusCreditUsd`) at 1:1 USD base value (`$10`, `$20`, `$50`, `$100`, `$500`, `$1,000`), plus `ADHOC_CREDIT_BONUS_PERCENT` when enabled (default `5%`, e.g., `$10` → `$10.50`, `$100` → `$105.00`).
2. **Monthly Refill vs. Permanent Top-up Balance**:
   - On each paid monthly subscription invoice, the monthly allowance resets to `plan.monthlyCreditUsd`, while unspent one-time pack balance (`bonusCreditUsd`) rolls over permanently:
     - `nextCreditUsd = addUsd(plan.monthlyCreditUsd, bonusCreditUsd)`
     - `nextCreditLimitUsd = nextCreditUsd`
   - Spending consumes monthly allowance first, and only reduces `bonusCreditUsd` once monthly allowance is exhausted:
     - `nextCreditUsd = subUsd(creditUsd, costUsd)`
     - `nextBonusCreditUsd = Math.min(bonusCreditUsd, nextCreditUsd)`
3. **Standardized USD Action Pricing & Welcome Grant**:
   - New account welcome grant: `WELCOME_CREDIT_USD = 6.00` (`$6.00`)
   - Image / scene frame / life photo / poster & element repaint / pose edit / product / style, director, & text-style preview / reel cover / subtitle plate / video locks: `IMAGE_COST_USD = 0.15` (`$0.15`)
   - Character blueprint board (2 images): `BLUEPRINT_COST_USD = 0.30` (`$0.30`)
   - Non-talking-head video (`minimax/hailuo-3`, ComfyUI `ref2va`, Extend; 5–15s, ElevenLabs voice included): `VIDEO_COST_PER_SECOND_USD = 0.10` (`$0.10/s`)
   - Sitting talking-head video (`heygen/avatar-iv`; 5–120s, voice included): `TALKING_HEAD_COST_PER_SECOND_USD = 0.18` (`$0.18/s`)
   - Scro Swap: static image `$0.15`; video/GIF `$0.15 + $0.10/s` (2–15s)
   - Teleport: `$0.15 + $0.10/s` (2–15s)
   - Extend Video (`6s`): `$0.60`
   - Future canvas models (Sub-project 2) will pass exact per-run USD costs down to `$0.0001` precision directly into the same `consumeCreditUsd` / `refundCreditUsd` primitives.

---

## 2. Precision Math & Formatting (`src/service/billing/usd.ts`)

To eliminate IEEE 754 floating-point drift (e.g., `6.00 - 0.15 = 5.8500000000000005`) while supporting sub-cent Mentalok AI Studio pricing (e.g., `$0.0008`), all USD credit arithmetic runs through integer ten-thousandths of a dollar (`USD_SCALE = 10_000`, i.e., `$0.0001` units):

- `toUsdUnits(amount: number): number` → `Math.round(amount * 10_000)`
- `fromUsdUnits(units: number): number` → `units / 10_000`
- `roundUsd4(amount: number): number` → `fromUsdUnits(toUsdUnits(amount))`
- `addUsd(a: number, b: number): number`
- `subUsd(a: number, b: number): number` (clamped or exact as specified by caller; balance spend never permits negative spend below `0`)
- `mulUsd(a: number, factor: number): number`
- `legacyCreditsToUsd(credits: number): number` → `roundUsd4(Math.max(0, credits) * LEGACY_CREDIT_TO_USD_RATE)` where `LEGACY_CREDIT_TO_USD_RATE = 0.04`
- `formatUsd(amount: number, options?: { compactSubCent?: boolean }): string`:
  - Standard display: `$59.00`, `$6.00`, `$0.15`, `$1,000.00` (2 decimal places with thousands separator).
  - Non-zero sub-cent amounts (`0 < |amount| < 0.01`): preserve up to 4 decimal places without trailing zeros beyond needed digits (e.g., `$0.0008`, `$0.0012`, `$0.004`).
  - Zero: `$0.00`.

---

## 3. Data Model & Zero-Downtime Migration (Approach A)

### 3.1 MongoDB Schema Updates

1. **`users` (`src/model/user.ts`)**:
   - Add canonical USD fields:
     - `creditUsd?: number` (total spendable USD balance; required for all new/migrated users)
     - `bonusCreditUsd?: number` (unspent one-time top-up USD balance that survives monthly refill)
     - `creditLimitUsd?: number` (current period meter denominator)
     - `creditMigratedAt?: Date` (timestamp set once converted from legacy `credits`)
   - Keep legacy `credits?: number`, `bonusCredits?: number`, `creditLimit?: number` optional in the Zod/TS type strictly for safe lazy read fallback and idempotent migration.
   - New user creation (`src/service/auth.ts`) writes `creditUsd: WELCOME_CREDIT_USD`, `bonusCreditUsd: 0`, `creditLimitUsd: WELCOME_CREDIT_USD`, and `creditMigratedAt: now` (omitting legacy `credits`, `bonusCredits`, `creditLimit` on newly created documents).

2. **`subscriptions` (`src/model/subscription.ts`)**:
   - Add `monthlyCreditUsd?: number`.
   - Keep `monthlyCredits?: number` optional for reading historical records; `resolveSubscriptionMonthlyUsd(sub)` reads `sub.monthlyCreditUsd ?? PLANS[sub.planId].monthlyCreditUsd`.

3. **`billing_settings` (`src/model/billing-settings.ts`)**:
   - Extend `CreditPackPrice` with `creditUsd?: number`.
   - `packPriceIsCurrent(stored, pack)` checks `stored?.priceId && stored?.amountUsd === pack.amountUsd && stored?.creditUsd === pack.creditUsd`.
   - Stripe product labels rotate automatically from `"Scro $10 儲值包 150 credits"` to `"Scro $10 USD Credit Pack ($10.00)"` (or localized `"Scro $10 儲值包 ($10.00 USD)"`).

4. **Generation & Job Cost Records**:
   - `Project.clips[]` (`src/model/project.ts`): add `chargedUsd?: number`. Helper `chargedClipUsd(clip)` returns `clip.chargedUsd ?? (clip.creditsCharged !== undefined ? legacyCreditsToUsd(clip.creditsCharged) : videoCostUsd(clip.durationSeconds ?? MIN_VIDEO_SECONDS))`.
   - `JutsuJob` (`src/model/jutsu-job.ts`), `TeleportJob` (`src/model/teleport-job.ts`), `ExtendJob` (`src/model/extend-job.ts`), `PoseEdit` / `Post` / `Character` / `Product` / `UserStyle`: store `chargedUsd?: number` on newly charged records; refund helpers fall back to `legacyCreditsToUsd(legacyCreditsCharged)` if a pre-migration in-flight job fails right after deploy.

5. **Affiliate Lots & Ledger (`src/model/affiliate.ts`, `src/service/affiliate/lots.ts`, `src/service/affiliate/engine.ts`)**:
   - `CreditLot`: add `creditUsdRemaining?: number`, `creditUsdOriginal?: number`, `cashCentsPerUsd?: number` (exact real-cash cents paid per `$1.00` of granted USD credit, e.g., `85` cents for a 15%-off signup promo subscription, or `95.2381` for a 5%-bonus adhoc pack).
   - `planFifoSpendUsd(lots, spendUsd)` consumes lots in FIFO order using integer ten-thousandths precision and computes `amountCents = Math.round(takenUsd * lot.cashCentsPerUsd)`.
   - `AffiliateLedgerEntry`: add `creditUsd?: number`, `cashCentsPerUsd?: number` alongside existing `amountCents`, `baseAmountCents`, `rate`.

### 3.2 Lazy Read Fallback & Idempotent Migration Script
- **Read Resolver (`resolveUserUsdBalance(user)`)**:
  - If `typeof user.creditUsd === "number"`, return `{ creditUsd: roundUsd4(user.creditUsd), bonusCreditUsd: roundUsd4(user.bonusCreditUsd ?? 0), creditLimitUsd: roundUsd4(user.creditLimitUsd ?? user.creditUsd) }`.
  - Otherwise (unmigrated legacy document), derive `{ creditUsd: legacyCreditsToUsd(user.credits ?? 0), bonusCreditUsd: legacyCreditsToUsd(user.bonusCredits ?? 0), creditLimitUsd: legacyCreditsToUsd(user.creditLimit ?? user.credits ?? 0) }`.
- **Atomic Write (`consumeCreditUsd` / `refundCreditUsd` / `resetMonthlyCreditUsd` / `grantPackCreditUsd`)**:
  - Uses optimistic concurrency match on either `{ clerkUserId, creditUsd: currentCreditUsd }` (migrated docs) or `{ clerkUserId, creditUsd: { $exists: false }, credits: user.credits }` (first write lazily migrates the doc and sets `creditMigratedAt`), with up to 2 automatic retries on concurrent modification before failing.
- **Migration Script (`scripts/migrate-credits-to-usd.ts`)**:
  - Executable via `npx tsx scripts/migrate-credits-to-usd.ts [--dry-run]`.
  - Converts all `users` where `creditUsd` does not exist (`creditUsd = legacyCreditsToUsd(credits)`, `bonusCreditUsd = legacyCreditsToUsd(bonusCredits ?? 0)`, `creditLimitUsd = legacyCreditsToUsd(creditLimit ?? credits)`, `creditMigratedAt = now`).
  - Backfills `subscriptions` where `monthlyCreditUsd` does not exist (`PLANS[planId].monthlyCreditUsd`).
  - Backfills `affiliate_lots` where `creditUsdRemaining` does not exist (`creditUsdRemaining = legacyCreditsToUsd(creditsRemaining)`, `creditUsdOriginal = legacyCreditsToUsd(creditsOriginal)`, `cashCentsPerUsd = creditsOriginal > 0 ? amountPaidCents / legacyCreditsToUsd(creditsOriginal) : 0`).
  - Safe to re-run repeatedly (strictly skips already migrated documents).

---

## 4. Billing Engine & Error Handling

- **Spend Gate (`evaluateCreditSpendGate`)**:
  - Unlimited allowlist (`hasUnlimitedCredits(email)`) bypasses deduction and commission unchanged.
  - If `creditUsd >= costUsd`, allow execution.
  - Otherwise: if no active subscription, throw `"請先訂閱方案才能產片"`; if subscribed, throw `"USD Credit 餘額不足，請加值或升級方案"`.
  - `isCreditGateError(error)` matches `"訂閱"`, `"餘額不足"`, `"USD Credit"`, and legacy `"credits 不足"` / `"insufficient"`.
- **Free Trial Gate (`assertFreeTrialClipAllowed`)**:
  - Unchanged access rules, using `bonusCreditUsd` instead of `bonusCredits`; error message updated to `"免費體驗僅支援預覽第 1 段動態影片，請先加值 USD Credit 或訂閱方案以解鎖完整影片"`.
- **Stripe Sync (`src/service/billing/sync-subscription.ts`)**:
  - `syncStripeSubscription`: writes `monthlyCreditUsd: plan.monthlyCreditUsd`; initializes balance if `resolveUserUsdBalance(current).creditUsd === 0`.
  - `grantCreditsFromInvoice`: calls `resetMonthlyCreditUsd(user.clerkUserId, plan.monthlyCreditUsd)` and records purchase commission + USD FIFO lot.
  - `grantPackFromCheckout`: calculates `grantedUsd = packCreditUsdWithBonus(pack.creditUsd, adhocBonusPercent())`, calls `grantPackCreditUsd(clerkUserId, grantedUsd, session.id)`, and records purchase commission + USD FIFO lot.
- **Unit Economics (`src/service/billing/unit-economics.ts`)**:
  - Update margin helpers to evaluate gross margin directly in USD (`plan.amountUsd` vs. expected COGS at the new USD action rates).

---

## 5. Full-Site & Multi-Client Rollout Scope

### 5.1 `explainer-web` Backend Services
Update every spend/refund/cost-estimate call site to use USD functions and `chargedUsd`:
- Storyboard & clip pipeline: `src/service/higgsfield/*`, `src/service/clip/*`, `src/service/clip-stage.ts`, `src/service/production-plan.ts`, `src/service/project/actions.ts`, `src/service/project/restart*.ts`, `src/service/director/*`
- Character, life, wardrobe, pose edit: `src/service/character/*`, `src/service/pose-edit/*`
- Remix & editing tools: `src/service/jutsu/*`, `src/service/teleport/*`, `src/service/extend/*`, `src/service/post/*`, `src/service/opencut/*`, `src/service/video-edit/reel-cover.ts`
- Asset previews: `src/service/product/*`, `src/service/style/*`, `src/service/text-style/*`
- Notifications & analytics: `src/service/notify/*`, `src/service/analytics/*`

### 5.2 `explainer-web` REST API (`/api/v1/*`) & MCP Server
- `GET /api/v1/me`: returns `user.creditUsd`, `user.creditLimitUsd`, `user.bonusCreditUsd`, and `subscription.monthlyCreditUsd`.
- `GET /api/v1/billing`: returns `creditUsd`, `creditLimitUsd`, `bonusCreditUsd`, `monthlyCreditUsd`, `plans[].monthlyCreditUsd`, `packs[].creditUsd`.
- `GET /api/v1/pickers` and generation endpoints: return `costUsd` instead of integer `credits`.
- `src/service/mcp/*` & `src/service/api/generation-docs.ts` & `src/presentation/api/llms/route.ts`: return and document `creditUsd` / `costUsd` across all MCP tools and API docs.

### 5.3 `explainer-web` Web App UI, Public Website & i18n
- **App Shell & Account Meter**: `app-shell.tsx`, `signed-in-account.tsx`, `avatar-credit-ring.tsx`, `use-credit-snapshot.ts`, `credits-changed.ts`, `signup-promo-banner.tsx` display remaining USD Credit (`$59.00` / `$59.00`, progress ring).
- **Billing, Usage & Dialogs**: `usage-view.tsx`, `billing-view.tsx`, `billing-plan-card.tsx`, `buy-credits-section.tsx`, `add-credit-modal.tsx`, `insufficient-credits-dialog.tsx`, `credits-tiers-overview.tsx`, `credit-offer-cards.tsx`, `invoices-view.tsx`.
- **Workspace Cost Badges & Action Buttons**: Home, Talking Head, Explainer, OpenEdit (`opencut-*`), Simple, Swap, Teleport, Life, Poster, Room, Characters, Products, Styles, Directors, Text Styles, MCP, Admin Analytics (`scroadmin/analytics/*`).
- **Public Website & Legal**: `/pricing`, `/economy`, `/terms`, `site-header.tsx`, `studio-powertools-band.tsx`, landing subpages (`product-promo`, `ai-influencer`, `explainer`, `talking-head`, `right-tool`, `cantonese`), blog CTA, Academy pricing references.
- **All i18n Dictionaries (`src/util/i18n/messages/**`)**: Replace legacy integer credit wording across `zh-Hant`, `zh-Hans`, `en`, `ja`, `ko`, `es`, `fr`, `de`, `pt`, `ru`, `id` and `workspace/*` with `USD Credit` / `$XX.XX` phrasing.

### 5.4 `explainer-app` (Flutter Mobile Client)
- Update Dart models (`lib/models/me.dart`, `lib/models/billing.dart`, `lib/models/pickers.dart`, `lib/models/mcp.dart`, `lib/models/character.dart`, `lib/models/folder.dart`) from `int credits` / `monthlyCredits` to `double creditUsd` / `creditLimitUsd` / `bonusCreditUsd` / `monthlyCreditUsd` using `real(json, ...)`.
- Add `lib/core/format/usd_format.dart` matching `formatUsd()` (`$59.00`, sub-cent up to 4 decimals).
- Update session providers, shell account footer & credit ring (`account_footer.dart`, `credit_ring.dart`), billing screens (`billing_page.dart`, `wallet_card.dart`, `plan_card.dart`, `pack_card.dart`), credit dialogs (`credit_dialogs.dart`), editor & creation sheets, and `strings_zh_hant.dart` / `strings_en.dart`.

### 5.5 Documentation Sync
- Update `pipeline-models.md` and `AGENTS.md` to reflect USD pricing (`$0.15/image`, `$0.10/s` standard video, `$0.18/s` talking-head video) per workspace rules.

---

## 6. Verification & Testing Plan

1. **New & Updated Unit Tests (`explainer-web`)**:
   - `src/service/billing/usd.test.ts`: 4-decimal arithmetic (`0.1 + 0.2`, `6.00 - 0.15`, `$0.0008` sub-cent precision), `legacyCreditsToUsd`, `formatUsd` formatting edge cases.
   - `src/service/billing/credit-balance.test.ts`: monthly USD refill preserving `bonusCreditUsd`, spending order, pack top-up, progress & used ratio.
   - `src/service/billing/credit-gate.test.ts`, `credit-pricing.test.ts`, `promo.test.ts`, `welcome-guard.test.ts`, `unlimited-credits.test.ts`.
   - `src/service/affiliate/affiliate.test.ts`: FIFO USD lot consumption with discounted subscriptions and bonus packs + commission reversal.
   - All existing clip/character/pose-edit/jutsu/paid-action/serialization tests updated to USD expectations.
2. **Typecheck, Test & Lint Gates**:
   - `explainer-web`: `npx tsc --noEmit`, `npx tsx --test 'src/**/*.test.ts'`, `npx eslint src/`.
   - `explainer-app`: `flutter analyze` and `flutter test`.
3. **Whole-Repo Residual Audit**:
   - Run targeted ripgrep audit across `explainer-web/src` and `explainer-app/lib` verifying zero user-facing integer `credits` labels or old unit constants (`145`, `1641`, `3333`, `5938`, `8723`, `4 credits`, `2 credits/s`) remain.
