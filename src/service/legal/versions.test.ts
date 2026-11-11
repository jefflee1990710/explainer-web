import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivacyDocument } from "@/presentation/components/legal/privacy-document";
import { TermsDocument } from "@/presentation/components/legal/terms-document";
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

test("TermsDocument and PrivacyDocument disclaim any affirmative duty to monitor and cover all sensitive and illegal AI content categories", () => {
  const termsHtml = renderToStaticMarkup(createElement(TermsDocument));
  const privacyHtml = renderToStaticMarkup(createElement(PrivacyDocument));

  // No affirmative duty to monitor / safe harbor protection for NOVAX Limited
  assert.match(termsHtml, /No Duty to Monitor/i);
  assert.match(termsHtml, /no affirmative legal or contractual duty/i);
  assert.match(termsHtml, /right, and not an obligation/i);

  // Sensitive & illegal content categories in Terms
  assert.match(termsHtml, /Safeguarding National Security Ordinance/i);
  assert.match(termsHtml, /election interference/i);
  assert.match(termsHtml, /biometric|eKYC/i);
  assert.match(termsHtml, /Cap\. 486/i);
  assert.match(termsHtml, /fabricated.*evidence|fake news/i);
  assert.match(termsHtml, /unlicensed medical, legal, or financial/i);
  assert.match(termsHtml, /animal cruelty/i);

  // Privacy Policy safe harbor & external copy disclaimer
  assert.match(privacyHtml, /no affirmative obligation or duty of care/i);
  assert.match(privacyHtml, /copies already downloaded or distributed externally/i);

  // Full platform feature coverage (Voice Cloning, Extend Video, Wardrobe, Products, Room, REST API / MCP keys, Affiliate Program)
  assert.match(termsHtml, /Extend Video/i);
  assert.match(termsHtml, /Wardrobe/i);
  assert.match(termsHtml, /MCP/i);
  assert.match(termsHtml, /Affiliate/i);

  // 2025-2026 Hong Kong ordinances & PCPD Data Protection Principles (Cap. 200 s.159AAE/s.161, Cap. 390, Cap. 210, Cap. 486 DPP1 & DPP3)
  assert.match(termsHtml, /159AAE/);
  assert.match(termsHtml, /Cap\. 390/);
  assert.match(termsHtml, /Cap\. 210/);
  assert.match(termsHtml, /Data Protection Principles 1 and 3/i);

  // Deployer AI Disclosure Obligation (EU AI Act Article 50 & HK Generative AI Guideline) & 48-hour NCII takedown (TAKE IT DOWN Act)
  assert.match(termsHtml, /Article 50/i);
  assert.match(termsHtml, /48 hours/i);
  assert.match(privacyHtml, /48 hours/i);
  assert.match(privacyHtml, /cross-border/i);
});
