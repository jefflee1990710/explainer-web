// Affiliate codes are short A–Z / 0–9 tokens, for example 3TPT4DHX.
const MIN_LEN = 4;
const MAX_LEN = 32;

export function referralCodeOrNull(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < MIN_LEN || code.length > MAX_LEN) return undefined;
  return code;
}

// The registration link wins. The cookie covers a later visit that lost ?ref=.
export function pickReferralCode(
  explicit: string | undefined | null,
  cookie: string | undefined | null,
): string | undefined {
  return referralCodeOrNull(explicit) || referralCodeOrNull(cookie);
}
