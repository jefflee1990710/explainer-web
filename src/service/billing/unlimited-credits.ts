import type { AppUser } from "@/model/user";

// Operator account. Spend checks pass and nothing is deducted. No other email.
const UNLIMITED_CREDIT_EMAIL = "jeff.lee.1990710@gmail.com";

// Returned to the app so buttons stay enabled. The database balance is left as it is.
const UNLIMITED_CREDIT_BALANCE = 1_000_000_000;

export function hasUnlimitedCredits(email?: string | null) {
  return email?.trim().toLowerCase() === UNLIMITED_CREDIT_EMAIL;
}

export function withUnlimitedCredits(user: AppUser): AppUser {
  if (!hasUnlimitedCredits(user.email)) return user;
  return { ...user, credits: UNLIMITED_CREDIT_BALANCE, creditLimit: UNLIMITED_CREDIT_BALANCE };
}
