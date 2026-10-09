import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { AppUser } from "@/model/user";
import { hasUnlimitedCredits, withUnlimitedCredits } from "@/service/billing/unlimited-credits";

function user(email: string, credits: number): AppUser {
  return {
    _id: new ObjectId(),
    clerkUserId: "uid",
    email,
    name: "Jeff",
    credits,
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

test("unlimited credits are shown without changing anyone else", () => {
  const owner = withUnlimitedCredits(user("jeff.lee.1990710@gmail.com", 12));
  assert.equal(owner.credits, 1_000_000_000);
  const other = user("other@gmail.com", 12);
  assert.equal(withUnlimitedCredits(other), other);
});
