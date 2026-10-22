// Signup offer and one-time pack bonus. Both are env-controlled.
// A discount locked onto a user at creation stays after the flag is turned off.

// 85 means 八五折: the customer pays 85% of the list price.
export const DEFAULT_SIGNUP_PROMO_FOLD = 85;

function readEnv(name: string) {
  return process.env[name];
}

function envFlag(name: string, fallback: boolean) {
  const raw = readEnv(name);
  if (raw == null || raw.trim() === "") return fallback;
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes" || value === "on") return true;
  if (value === "0" || value === "false" || value === "no" || value === "off") return false;
  return fallback;
}

// Current default is on: new accounts lock in the permanent discount.
export function signupPromoEnabled() {
  return envFlag("SIGNUP_PROMO_ENABLED", true);
}

// How many 折 new signups lock in. 85 is 八五折. Out-of-range values fall back to 85.
export function signupPromoFold() {
  const raw = readEnv("SIGNUP_PROMO_FOLD");
  if (raw == null || raw.trim() === "") return DEFAULT_SIGNUP_PROMO_FOLD;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_SIGNUP_PROMO_FOLD;
  const fold = Math.round(value);
  if (fold < 1 || fold > 100) return DEFAULT_SIGNUP_PROMO_FOLD;
  return fold;
}

// Percent taken off the list price. 85折 locks in as 15.
export function signupDiscountPercent() {
  return 100 - signupPromoFold();
}

// Extra credits on an adhoc pack, as a whole percent. Current default is 5.
export function adhocBonusPercent() {
  const raw = readEnv("ADHOC_CREDIT_BONUS_PERCENT");
  if (raw == null || raw.trim() === "") return 5;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round(value));
}

// Credits actually granted for a pack after the bonus. Price stays the list amount.
export function packCreditsWithBonus(baseCredits: number, percent: number) {
  if (percent <= 0 || baseCredits <= 0) return baseCredits;
  return Math.round((baseCredits * (100 + percent)) / 100);
}

// Share of list price the customer pays. 15% off is 85.
export function payPercent(discountPercent: number) {
  return Math.max(0, 100 - discountPercent);
}
