import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Folder } from "@/model/folder";
import type { Project } from "@/model/project";
import type { Subscription } from "@/model/subscription";
import type { AppUser } from "@/model/user";
import { publicSubscription, publicUser, toPublicFolder } from "@/presentation/serialize";

function folder(): Folder {
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "user_1",
    name: "Scro",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function video(overrides: Partial<Project> & { title: string }): Project {
  const { title, ...rest } = overrides;
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "user_1",
    projectId: new ObjectId(),
    skillId: new ObjectId(),
    skillSlug: "cartoon-explainer-video-director",
    source: title,
    aspectRatio: "9:16",
    durationPreset: "short",
    status: "production",
    phaseA: { localizedTitle: title, englishTitle: title } as Project["phaseA"],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...rest,
    clips: rest.clips ?? [],
    creditsCharged: rest.creditsCharged ?? false,
  };
}

test("folder videos list the most recently updated first", () => {
  const older = video({
    title: "Old",
    createdAt: new Date("2026-10-03T00:00:00Z"),
    updatedAt: new Date("2026-10-03T00:00:00Z"),
  });
  const newer = video({
    title: "Fresh generation",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-03T12:00:00Z"),
  });
  const cards = toPublicFolder(folder(), [older, newer]).videos;
  assert.deepEqual(
    cards.map((card) => card.title),
    ["Fresh generation", "Old"],
  );
});

test("publicUser emits USD credit fields and lazily converts unmigrated legacy balances", () => {
  const now = new Date("2026-11-19T00:00:00Z");
  const migrated: AppUser = {
    _id: new ObjectId(),
    clerkUserId: "uid_migrated",
    email: "migrated@example.com",
    name: "Migrated",
    creditUsd: 59,
    creditLimitUsd: 69.5,
    bonusCreditUsd: 10.5,
    createdAt: now,
    updatedAt: now,
  };
  const dto = publicUser(migrated) as Record<string, unknown>;
  assert.equal(dto.creditUsd, 59);
  assert.equal(dto.creditLimitUsd, 69.5);
  assert.equal(dto.bonusCreditUsd, 10.5);
  assert.equal("credits" in dto, false);

  const legacy: AppUser = {
    _id: new ObjectId(),
    clerkUserId: "uid_legacy",
    email: "legacy@example.com",
    name: "Legacy",
    credits: 150,
    creditLimit: 200,
    bonusCredits: 50,
    createdAt: now,
    updatedAt: now,
  };
  const legacyDto = publicUser(legacy) as Record<string, unknown>;
  assert.equal(legacyDto.creditUsd, 6);
  assert.equal(legacyDto.creditLimitUsd, 8);
  assert.equal(legacyDto.bonusCreditUsd, 2);
  assert.equal("credits" in legacyDto, false);
});

test("publicSubscription emits monthlyCreditUsd with plan fallback for legacy records", () => {
  assert.equal(publicSubscription(null), null);

  const now = new Date("2026-11-19T00:00:00Z");
  const migratedSub: Subscription = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "uid_1",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    stripePriceId: "price_1",
    planId: "studio",
    status: "active",
    monthlyCreditUsd: 249,
    currentPeriodStart: now,
    currentPeriodEnd: now,
    createdAt: now,
    updatedAt: now,
  };
  const dto = publicSubscription(migratedSub) as Record<string, unknown>;
  assert.equal(dto.monthlyCreditUsd, 249);
  assert.equal("monthlyCredits" in dto, false);

  const legacySub: Subscription = {
    ...migratedSub,
    planId: "pro",
    monthlyCreditUsd: undefined,
    monthlyCredits: 3333,
  };
  const legacyDto = publicSubscription(legacySub) as Record<string, unknown>;
  assert.equal(legacyDto.monthlyCreditUsd, 129);
  assert.equal("monthlyCredits" in legacyDto, false);
});
