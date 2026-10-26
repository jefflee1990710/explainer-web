import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateWelcomeGrant,
  hashClientIp,
  isDisposableEmail,
  normalizeEmail,
  type WelcomeGrantStore,
} from "@/service/billing/welcome-guard";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";

function createFakeGrantStore(): WelcomeGrantStore {
  const rows: Array<{
    clerkUserId: string;
    normalizedEmail: string;
    deviceId?: string;
    ipHash?: string;
    grantedAt: Date;
  }> = [];

  return {
    async hasNormalizedEmail(email) {
      return rows.some((r) => r.normalizedEmail === email);
    },
    async hasDeviceId(deviceId) {
      return rows.some((r) => r.deviceId === deviceId);
    },
    async countRecentByIpHash(ipHash, since) {
      return rows.filter((r) => r.ipHash === ipHash && r.grantedAt >= since).length;
    },
    async recordGrant(grant) {
      rows.push({ ...grant, grantedAt: new Date() });
    },
  };
}

describe("normalizeEmail", () => {
  it("strips Gmail dots and plus aliases and normalizes googlemail.com", () => {
    assert.equal(normalizeEmail("Jeff.Lee+test1@Gmail.com"), "jefflee@gmail.com");
    assert.equal(normalizeEmail("j.e.f.f+99@googlemail.com"), "jeff@gmail.com");
  });

  it("strips plus aliases on non-Gmail domains while keeping dots", () => {
    assert.equal(normalizeEmail("first.last+promo@company.io"), "first.last@company.io");
  });
});

describe("isDisposableEmail", () => {
  it("detects disposable domains and allows normal providers", () => {
    assert.equal(isDisposableEmail("a@mailinator.com"), true);
    assert.equal(isDisposableEmail("b@sub.10minutemail.com"), true);
    assert.equal(isDisposableEmail("c@yopmail.com"), true);
    assert.equal(isDisposableEmail("user@gmail.com"), false);
  });
});

describe("evaluateWelcomeGrant", () => {
  it("denies unverified email", async () => {
    const store = createFakeGrantStore();
    const res = await evaluateWelcomeGrant(
      {
        clerkUserId: "u1",
        email: "user@gmail.com",
        emailVerified: false,
      },
      store,
    );
    assert.equal(res.credits, 0);
    assert.equal(res.reason, "email_unverified");
  });

  it("denies disposable email even when verified", async () => {
    const store = createFakeGrantStore();
    const res = await evaluateWelcomeGrant(
      {
        clerkUserId: "u1",
        email: "user@mailinator.com",
        emailVerified: true,
      },
      store,
    );
    assert.equal(res.credits, 0);
    assert.equal(res.reason, "disposable_email");
  });

  it("grants once per normalized email and blocks Gmail alias farming", async () => {
    const store = createFakeGrantStore();
    const first = await evaluateWelcomeGrant(
      {
        clerkUserId: "u1",
        email: "farmer@gmail.com",
        emailVerified: true,
      },
      store,
    );
    assert.equal(first.credits, WELCOME_CREDITS);

    const alias = await evaluateWelcomeGrant(
      {
        clerkUserId: "u2",
        email: "f.a.r.m.e.r+2@googlemail.com",
        emailVerified: true,
      },
      store,
    );
    assert.equal(alias.credits, 0);
    assert.equal(alias.reason, "duplicate_email");
  });

  it("grants once per deviceId and blocks second account on same phone", async () => {
    const store = createFakeGrantStore();
    const first = await evaluateWelcomeGrant(
      {
        clerkUserId: "u1",
        email: "one@gmail.com",
        emailVerified: true,
        deviceId: "device-abc-123456",
      },
      store,
    );
    assert.equal(first.credits, WELCOME_CREDITS);

    const second = await evaluateWelcomeGrant(
      {
        clerkUserId: "u2",
        email: "two@gmail.com",
        emailVerified: true,
        deviceId: "device-abc-123456",
      },
      store,
    );
    assert.equal(second.credits, 0);
    assert.equal(second.reason, "duplicate_device");
  });

  it("blocks more than 2 grants from the same IP within 24 hours", async () => {
    const store = createFakeGrantStore();
    const ipHash = hashClientIp("203.0.113.42");
    assert.ok(ipHash);

    const g1 = await evaluateWelcomeGrant(
      { clerkUserId: "u1", email: "a1@gmail.com", emailVerified: true, clientIp: "203.0.113.42" },
      store,
    );
    const g2 = await evaluateWelcomeGrant(
      { clerkUserId: "u2", email: "a2@gmail.com", emailVerified: true, clientIp: "203.0.113.42" },
      store,
    );
    const g3 = await evaluateWelcomeGrant(
      { clerkUserId: "u3", email: "a3@gmail.com", emailVerified: true, clientIp: "203.0.113.42" },
      store,
    );

    assert.equal(g1.credits, WELCOME_CREDITS);
    assert.equal(g2.credits, WELCOME_CREDITS);
    assert.equal(g3.credits, 0);
    assert.equal(g3.reason, "ip_rate_limit");
  });
});
