import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { AppUser } from "@/model/user";
import { hasUnlimitedCredits, withUnlimitedCredits } from "@/service/billing/unlimited-credits";

function user(email: string, creditUsd: number, legacyCredits?: number): AppUser {
  return {
    _id: new ObjectId(),
    clerkUserId: "uid",
    email,
    name: "Jeff",
    creditUsd,
    creditLimitUsd: creditUsd,
    ...(legacyCredits !== undefined ? { credits: legacyCredits } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("only one email has unlimited credits", () => {
  assert.equal(hasUnlimitedCredits("jeff.lee.1990710@gmail.com"), true);
  assert.equal(hasUnlimitedCredits("Jeff.Lee.1990710@gmail.com"), true);
  assert.equal(hasUnlimitedCredits(" jeff.lee.1990710@gmail.com "), true);
  assert.equal(hasUnlimitedCredits("jeff.lee.1990710@gmail.com.au"), false);
  assert.equal(hasUnlimitedCredits("other@gmail.com"), false);
  assert.equal(hasUnlimitedCredits(""), false);
});

test("unlimited USD credits are shown without changing anyone else or legacy credits", () => {
  const owner = withUnlimitedCredits(user("jeff.lee.1990710@gmail.com", 6, 12));
  assert.equal(owner.creditUsd, 1_000_000);
  assert.equal(owner.creditLimitUsd, 1_000_000);
  assert.equal(owner.credits, 12);
  const other = user("other@gmail.com", 6, 12);
  assert.equal(withUnlimitedCredits(other), other);
});
