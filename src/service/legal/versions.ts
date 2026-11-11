import type { AppUser } from "@/model/user";

// Bump the matching date when that document changes. Stale acceptances are blocked after login.
export const TERMS_VERSION = "2026-11-11";
export const PRIVACY_VERSION = "2026-11-11";

export const LEGAL_CONSENT_COOKIE = "scro_legal_consent";

export type LegalAcceptance = NonNullable<AppUser["legalAcceptance"]>;
export type MarketingConsent = NonNullable<AppUser["marketingConsent"]>;

export function currentLegalAcceptance(acceptedAt = new Date()): LegalAcceptance {
  return {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt,
  };
}

export function buildMarketingConsentUpdate(
  consented: boolean,
  updatedAt = new Date(),
): {
  marketingEmailsAllowed: boolean;
  marketingConsent: MarketingConsent;
} {
  const allowed = Boolean(consented);
  return {
    marketingEmailsAllowed: allowed,
    marketingConsent: {
      consented: allowed,
      updatedAt,
    },
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

// True when a newly registered user enters /app for the first time without a recorded legalAcceptance yet.
// Stale versions (where legalAcceptance exists with an older date) still require explicit re-consent via AcceptPoliciesDialog.
export function shouldAutoRecordInitialPolicyAcceptance(
  user: Pick<AppUser, "legalAcceptance">,
): boolean {
  return !user.legalAcceptance;
}
