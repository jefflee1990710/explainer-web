// Precision unit for USD credit balances ($0.0001 = 1 unit).
// Integer arithmetic avoids IEEE 754 drift while supporting sub-cent model pricing (e.g. $0.0008).
export const USD_SCALE = 10_000;

// Conversion rate for migrating pre-USD integer credits to USD credit balances.
export const LEGACY_CREDIT_TO_USD_RATE = 0.04;

// Converts a USD dollar amount into integer ten-thousandth-dollar units.
export function toUsdUnits(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * USD_SCALE) || 0;
}

// Converts integer ten-thousandth-dollar units back into a USD dollar number.
export function fromUsdUnits(units: number): number {
  if (!Number.isFinite(units)) return 0;
  return units / USD_SCALE || 0;
}

// Rounds a USD amount to 4 decimal places using integer scale units.
export function roundUsd4(amount: number): number {
  return fromUsdUnits(toUsdUnits(amount));
}

// Adds two USD amounts without floating-point drift.
export function addUsd(a: number, b: number): number {
  return fromUsdUnits(toUsdUnits(a) + toUsdUnits(b));
}

// Subtracts USD amount b from a without floating-point drift.
export function subUsd(a: number, b: number): number {
  return fromUsdUnits(toUsdUnits(a) - toUsdUnits(b));
}

// Multiplies a USD amount by a numeric factor and rounds to 4 decimal places.
export function mulUsd(a: number, factor: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(factor)) return 0;
  return roundUsd4(a * factor);
}

// Converts legacy integer credits to USD at $0.04/credit, clamping non-positive or non-finite inputs to 0.
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

// Formats a per-unit USD pricing rate (default unit: seconds).
export function formatUsdRate(amountPerUnit: number, unit = "s"): string {
  return `${formatUsd(amountPerUnit)}/${unit}`;
}
