import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bucketLandingPath,
  buildWebsiteAnalyticsFromEvents,
  classifyReferrer,
  normalizeWebsitePath,
  type WebsiteAnalyticsEventInput,
} from "@/service/analytics/website-analytics";

test("normalizeWebsitePath and bucketLandingPath group blog post URLs and strip query strings", () => {
  assert.equal(normalizeWebsitePath("/pricing?hl=zh-Hant"), "/pricing");
  assert.equal(normalizeWebsitePath("/posts/"), "/posts");
  assert.equal(bucketLandingPath("/posts/ai-influencer-guide"), "/posts/[slug]");
  assert.equal(bucketLandingPath("/posts"), "/posts");
});

test("classifyReferrer categorizes search, AI referrals, social, and direct traffic", () => {
  assert.equal(classifyReferrer(null).channel, "直接流量 (Direct)");
  assert.equal(classifyReferrer("https://www.scro.io/pricing").host, "(direct)");
  assert.equal(
    classifyReferrer("https://www.google.com/search?q=scro").channel,
    "自然搜尋 (Organic Search)",
  );
  assert.equal(
    classifyReferrer("https://chatgpt.com/").channel,
    "AI 搜尋推薦 (AI / LLM Referral)",
  );
  assert.equal(
    classifyReferrer("https://www.instagram.com/").channel,
    "社群媒體 (Social)",
  );
});

test("buildWebsiteAnalyticsFromEvents links anonId to sign-up and studio flow across the 4-stage funnel", () => {
  const base = new Date("2026-10-30T01:00:00.000Z").getTime();
  const events: WebsiteAnalyticsEventInput[] = [
    // Visitor 1: enters /, visits /pricing, goes to /sign-up, completes sign_up, enters /app
    {
      event: "page_view",
      anonId: "anon_1",
      sessionId: "sess_1",
      path: "/",
      referrer: "https://www.google.com/",
      locale: "zh-Hant",
      createdAt: new Date(base + 1000),
    },
    {
      event: "page_view",
      anonId: "anon_1",
      sessionId: "sess_1",
      path: "/pricing",
      locale: "zh-Hant",
      createdAt: new Date(base + 2000),
    },
    {
      event: "page_view",
      anonId: "anon_1",
      sessionId: "sess_1",
      path: "/sign-up",
      locale: "zh-Hant",
      createdAt: new Date(base + 3000),
    },
    {
      event: "sign_up",
      anonId: "anon_1",
      sessionId: "sess_1",
      clerkUserId: "user_1",
      userEmail: "founder@hk.co",
      path: "/sign-up",
      params: { method: "google" },
      createdAt: new Date(base + 4000),
    },
    {
      event: "page_view",
      anonId: "anon_1",
      sessionId: "sess_1",
      clerkUserId: "user_1",
      path: "/app",
      createdAt: new Date(base + 5000),
    },
    // Visitor 2: enters /cantonese, goes to /sign-in, fails auth and drops off
    {
      event: "page_view",
      anonId: "anon_2",
      sessionId: "sess_2",
      path: "/cantonese",
      referrer: "https://chatgpt.com/",
      locale: "zh-Hant",
      createdAt: new Date(base + 6000),
    },
    {
      event: "page_view",
      anonId: "anon_2",
      sessionId: "sess_2",
      path: "/sign-in",
      locale: "zh-Hant",
      createdAt: new Date(base + 7000),
    },
    {
      event: "auth_failed",
      anonId: "anon_2",
      sessionId: "sess_2",
      path: "/sign-in",
      params: { mode: "sign-in", method: "email", code: "auth/invalid-credential" },
      createdAt: new Date(base + 8000),
    },
    // Visitor 3: single-page bounce on /posts/intro
    {
      event: "page_view",
      anonId: "anon_3",
      sessionId: "sess_3",
      path: "/posts/intro-guide",
      locale: "en",
      createdAt: new Date(base + 9000),
    },
  ];

  const report = buildWebsiteAnalyticsFromEvents(events, {
    newSignUps7d: 5,
    newSignUps30d: 18,
  });

  assert.equal(report.kpis.uniqueWebsiteVisitors, 3);
  assert.equal(report.kpis.totalPublicPageViews, 4);
  assert.equal(report.kpis.visitorsReachedAuth, 2);
  assert.equal(report.kpis.convertedToAccountVisitors, 1);
  assert.equal(report.kpis.visitorsEnteredStudio, 1);

  assert.equal(report.funnel.length, 4);
  assert.equal(report.funnel[0]?.visitorCount, 3);
  assert.equal(report.funnel[1]?.visitorCount, 2);
  assert.equal(report.funnel[2]?.visitorCount, 1);
  assert.equal(report.funnel[3]?.visitorCount, 1);

  assert.equal(report.authBreakdown.signUpSuccessUsers, 1);
  assert.equal(report.authBreakdown.googleAuthCount, 1);
  assert.equal(report.authBreakdown.authFailureCount, 1);

  const blogLanding = report.landingPages.find((p) => p.path === "/posts/[slug]");
  assert.ok(blogLanding);
  assert.equal(blogLanding.entrySessions, 1);
  assert.equal(blogLanding.bounceSessions, 1);
  assert.equal(blogLanding.bounceRatePercent, 100);

  const visitor1 = report.recentVisitors.find((v) => v.anonId === "anon_1");
  assert.ok(visitor1);
  assert.equal(visitor1.authOutcome, "signed_up");
  assert.equal(visitor1.reachedStudio, true);
  assert.equal(visitor1.userEmail, "founder@hk.co");
});
