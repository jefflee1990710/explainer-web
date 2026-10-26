# Anti-Abuse & Free Credits Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users from repeatedly registering new accounts to farm unlimited free credits across Web and Scro Pose App.

**Architecture:** Implement a 4-layer defense-in-depth system: (1) email normalization (`+alias` and Gmail dot stripping), disposable domain blocking, and `email_verified` gating before granting `WELCOME_CREDITS`; (2) a `welcome_credit_grants` MongoDB collection tracking `normalizedEmail`, `deviceId` (`X-Device-Id`), and `ipHash` (max 2 per 24h); (3) a free-tier cap of 3 pose edits (`FREE_TRIAL_POSE_EDIT_LIMIT = 3`) in `createPoseEdit`; and (4) `1k` resolution plus a bottom-right `Scro.io` watermark via `sharp` for free-tier pose edits.

**Tech Stack:** Next.js 16 (TypeScript, MongoDB, `sharp`, Node built-in `node:test`), Flutter / Dart (`Riverpod`, `Dio`, `flutter_test`).

**Spec:** `docs/superpowers/specs/2026-10-26-anti-abuse-free-credits-design.md`

## Global Constraints

- MongoDB collections must always be typed: `db.collection<OptionalId<WelcomeCreditGrant>>("welcome_credit_grants")`.
- Never make live paid provider calls during unit tests.
- All user-facing error messages and comments follow Traditional Chinese (繁體中文).

---

### Task 1: Email Normalization, Disposable Domain Filter & Welcome Grant Guard

**Files:**
- Create: `src/model/welcome-credit-grant.ts`
- Create: `src/dao/welcome-credit-grants.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/billing/welcome-guard.ts`
- Test: `src/service/billing/welcome-guard.test.ts`

- [ ] **Step 1: Write unit tests in `src/service/billing/welcome-guard.test.ts`**
- [ ] **Step 2: Create model, DAO, and `src/service/billing/welcome-guard.ts`**
- [ ] **Step 3: Wire `welcome-guard` into `upsertAppUserFromIdentity` (`src/service/auth.ts`) and `authenticateApiRequest` (`src/service/api/auth.ts`)**
- [ ] **Step 4: Run `npx tsx --test src/service/billing/welcome-guard.test.ts`**

---

### Task 2: Free-Tier Pose Edit Quota (3 Edits Max) & 1K Resolution Downgrade

**Files:**
- Modify: `src/model/pose-edit.ts`
- Modify: `src/service/pose-edit/errors.ts`
- Modify: `src/service/pose-edit/create.ts`
- Modify: `src/service/pose-edit/send.ts`
- Test: `src/service/pose-edit/create.test.ts`

- [ ] **Step 1: Add `freeTier?: boolean` to `PoseEdit` and `POSE_EDIT_ERRORS.freeTrialLimit` / `POSE_EDIT_ERRORS.verifyEmail`**
- [ ] **Step 2: Enforce `FREE_TRIAL_POSE_EDIT_LIMIT = 3` and `emailVerified === false` refusal in `createPoseEdit`**
- [ ] **Step 3: Use `resolution: edit.freeTier ? "1k" : "2k"` in `sendPoseEdit`**
- [ ] **Step 4: Run `npx tsx --test src/service/pose-edit/create.test.ts`**

---

### Task 3: Free-Tier `Scro.io` Watermark on Completed Pose Edits

**Files:**
- Create: `src/service/pose-edit/watermark.ts`
- Modify: `src/service/pose-edit/sync.ts`
- Test: `src/service/pose-edit/watermark.test.ts`

- [ ] **Step 1: Write `applyPoseWatermark` using `sharp` with SVG badge in bottom-right corner**
- [ ] **Step 2: Apply watermark in `syncPoseEditJob` when `edit.freeTier === true`**
- [ ] **Step 3: Run `npx tsx --test src/service/pose-edit/watermark.test.ts`**

---

### Task 4: Flutter `scro-pose` Device ID Header & Email Verification

**Files:**
- Create: `lib/core/config/device_id_store.dart`
- Modify: `lib/data/pose_api.dart`
- Modify: `lib/features/studio/studio_page.dart`
- Modify: `lib/core/auth/auth_service.dart`
- Test: `test/device_id_store_test.dart`

- [ ] **Step 1: Create `DeviceIdStore` generating & persisting a device UUID, and attach `X-Device-Id` in `PoseApi` interceptor**
- [ ] **Step 2: Trigger `sendEmailVerification()` on email sign-up in `AuthService`**
- [ ] **Step 3: Run `flutter test` and `flutter analyze`**
