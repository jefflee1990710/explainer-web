import type { AppUser } from "@/model/user";

// Bump the matching date when that document changes. Stale acceptances are blocked after login.
export const TERMS_VERSION = "2026-09-29";
export const PRIVACY_VERSION = "2026-09-29";

export const LEGAL_CONSENT_COOKIE = "scro_legal_consent";

export type LegalAcceptance = NonNullable<AppUser["legalAcceptance"]>;

export function currentLegalAcceptance(acceptedAt = new Date()): LegalAcceptance {
  return {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt,
  };
}

export function consentCookieValue() {
  return `${TERMS_VERSION}.${PRIVACY_VERSION}`;
}

export function consentMatchesCurrent(value: string | undefined) {
  return value === consentCookieValue();
}

// True when the stored versions are missing or older than the documents now published.
export function needsPolicyAcceptance(user: Pick<AppUser, "legalAcceptance">) {
  const accepted = user.legalAcceptance;
  if (!accepted) return true;
  return accepted.termsVersion !== TERMS_VERSION || accepted.privacyVersion !== PRIVACY_VERSION;
}
