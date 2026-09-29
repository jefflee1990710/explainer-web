import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  consentCookieValue,
  consentMatchesCurrent,
  needsPolicyAcceptance,
} from "@/service/legal/versions";

test("a user with no acceptance must accept", () => {
  assert.equal(needsPolicyAcceptance({}), true);
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
