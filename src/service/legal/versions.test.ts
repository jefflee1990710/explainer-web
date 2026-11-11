import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  buildMarketingConsentUpdate,
  consentCookieValue,
  consentMatchesCurrent,
  needsPolicyAcceptance,
  shouldAutoRecordInitialPolicyAcceptance,
} from "@/service/legal/versions";

test("a user with no acceptance must accept", () => {
  assert.equal(needsPolicyAcceptance({}), true);
});

test("shouldAutoRecordInitialPolicyAcceptance is true only when legalAcceptance has never been recorded", () => {
  assert.equal(shouldAutoRecordInitialPolicyAcceptance({}), true);
  assert.equal(
    shouldAutoRecordInitialPolicyAcceptance({
      legalAcceptance: {
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: new Date(),
      },
    }),
    false,
  );
  assert.equal(
    shouldAutoRecordInitialPolicyAcceptance({
      legalAcceptance: {
        termsVersion: "2020-01-01",
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: new Date(),
      },
    }),
    false,
  );
});

test("current versions pass and a stale terms version does not", () => {
  assert.equal(
    needsPolicyAcceptance({
      legalAcceptance: {
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: new Date(),
      },
    }),
    false,
  );
  assert.equal(
    needsPolicyAcceptance({
      legalAcceptance: {
        termsVersion: "2020-01-01",
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: new Date(),
      },
    }),
    true,
  );
});

test("signup cookie matches only the published pair", () => {
  assert.equal(consentMatchesCurrent(consentCookieValue()), true);
  assert.equal(consentMatchesCurrent(`${TERMS_VERSION}.1999-01-01`), false);
  assert.equal(consentMatchesCurrent(undefined), false);
});

test("previous 2026-10-24 acceptance requires re-acceptance after 2026-11-11 update", () => {
  assert.equal(
    needsPolicyAcceptance({
      legalAcceptance: {
        termsVersion: "2026-10-24",
        privacyVersion: "2026-10-24",
        acceptedAt: new Date("2026-10-25T00:00:00Z"),
      },
    }),
    true,
  );
});

test("buildMarketingConsentUpdate sets both top-level flag and timestamped object", () => {
  const now = new Date("2026-11-11T08:00:00Z");
  const optIn = buildMarketingConsentUpdate(true, now);
  assert.equal(optIn.marketingEmailsAllowed, true);
  assert.deepEqual(optIn.marketingConsent, { consented: true, updatedAt: now });

  const optOut = buildMarketingConsentUpdate(false, now);
  assert.equal(optOut.marketingEmailsAllowed, false);
  assert.deepEqual(optOut.marketingConsent, { consented: false, updatedAt: now });
});
