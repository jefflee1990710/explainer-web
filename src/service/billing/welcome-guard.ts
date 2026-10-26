import { createHash } from "crypto";
import { welcomeCreditGrantsCollection } from "@/dao";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";

// Max number of welcome credit grants allowed from the same IP hash within 24 hours.
export const MAX_WELCOME_GRANTS_PER_IP_24H = 2;

const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "10minutemail.com",
  "10minutemail.net",
  "burnermail.io",
  "discard.email",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "harakirimail.com",
  "inboxkitten.com",
  "jetable.org",
  "mailcatch.com",
  "maildrop.cc",
  "mailesia.com",
  "mailinator.com",
  "mailnesia.com",
  "mailsac.com",
  "mintemail.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "Redacted",
  "sharklasers.com",
  "Spam4.me",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.dev",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
].map((d) => d.toLowerCase()));

// Strip Gmail dots and +aliases so farmer+1@gmail.com and f.a.r.m.e.r@googlemail.com resolve identically.
export function normalizeEmail(rawEmail: string): string {
  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0) return trimmed;
  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }
  const plusIndex = local.indexOf("+");
  if (plusIndex >= 0) {
    local = local.slice(0, plusIndex);
  }
  if (domain === "gmail.com") {
    local = local.replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

// Check whether an email belongs to a known disposable / throwaway email provider.
export function isDisposableEmail(rawEmail: string): boolean {
  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0) return true;
  const domain = trimmed.slice(atIndex + 1);
  if (!domain || !domain.includes(".")) return true;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  for (const blocked of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

// Sanitize a client-supplied X-Device-Id header so only reasonable identifiers are persisted.
export function sanitizeDeviceId(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim();
  if (cleaned.length < 8 || cleaned.length > 128) return undefined;
  if (!/^[a-zA-Z0-9._-]+$/.test(cleaned)) return undefined;
  return cleaned;
}

// One-way SHA-256 hash of a client IP so raw IP addresses are not stored in MongoDB.
export function hashClientIp(rawIp?: string | null): string | undefined {
  if (!rawIp) return undefined;
  const firstIp = rawIp.split(",")[0]?.trim();
  if (!firstIp) return undefined;
  return createHash("sha256").update(`scro-welcome-ip:${firstIp}`).digest("hex");
}

export type WelcomeGrantDenialReason =
  | "email_missing"
  | "email_unverified"
  | "disposable_email"
  | "duplicate_email"
  | "duplicate_device"
  | "ip_rate_limit";

export type WelcomeGrantDecision =
  | { credits: number; granted: true; reason?: undefined; normalizedEmail: string }
  | { credits: 0; granted: false; reason: WelcomeGrantDenialReason; normalizedEmail: string };

export type WelcomeGrantStore = {
  hasNormalizedEmail(normalizedEmail: string): Promise<boolean>;
  hasDeviceId(deviceId: string): Promise<boolean>;
  countRecentByIpHash(ipHash: string, since: Date): Promise<number>;
  recordGrant(grant: {
    clerkUserId: string;
    normalizedEmail: string;
    deviceId?: string;
    ipHash?: string;
  }): Promise<void>;
};

export function mongoWelcomeGrantStore(): WelcomeGrantStore {
  return {
    async hasNormalizedEmail(normalizedEmail) {
      const col = await welcomeCreditGrantsCollection();
      const doc = await col.findOne({ normalizedEmail }, { projection: { _id: 1 } });
      return Boolean(doc);
    },
    async hasDeviceId(deviceId) {
      const col = await welcomeCreditGrantsCollection();
      const doc = await col.findOne({ deviceId }, { projection: { _id: 1 } });
      return Boolean(doc);
    },
    async countRecentByIpHash(ipHash, since) {
      const col = await welcomeCreditGrantsCollection();
      return col.countDocuments({ ipHash, grantedAt: { $gte: since } });
    },
    async recordGrant(grant) {
      const col = await welcomeCreditGrantsCollection();
      await col.insertOne({
        ...grant,
        grantedAt: new Date(),
      });
    },
  };
}

// Evaluate whether a newly created user should receive WELCOME_CREDITS, and record the grant when approved.
export async function evaluateWelcomeGrant(
  input: {
    clerkUserId: string;
    email?: string | null;
    emailVerified?: boolean;
    deviceId?: string | null;
    clientIp?: string | null;
  },
  store: WelcomeGrantStore = mongoWelcomeGrantStore(),
): Promise<WelcomeGrantDecision> {
  const rawEmail = (input.email || "").trim();
  const normalizedEmail = normalizeEmail(rawEmail);
  if (!rawEmail || !normalizedEmail.includes("@")) {
    return { credits: 0, granted: false, reason: "email_missing", normalizedEmail };
  }
  // Default emailVerified to true only when callers did not pass boolean false explicitly.
  if (input.emailVerified === false) {
    return { credits: 0, granted: false, reason: "email_unverified", normalizedEmail };
  }
  if (isDisposableEmail(rawEmail)) {
    return { credits: 0, granted: false, reason: "disposable_email", normalizedEmail };
  }
  if (await store.hasNormalizedEmail(normalizedEmail)) {
    return { credits: 0, granted: false, reason: "duplicate_email", normalizedEmail };
  }

  const deviceId = sanitizeDeviceId(input.deviceId);
  if (deviceId && (await store.hasDeviceId(deviceId))) {
    return { credits: 0, granted: false, reason: "duplicate_device", normalizedEmail };
  }

  const ipHash = hashClientIp(input.clientIp);
  if (ipHash) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await store.countRecentByIpHash(ipHash, since);
    if (recentCount >= MAX_WELCOME_GRANTS_PER_IP_24H) {
      return { credits: 0, granted: false, reason: "ip_rate_limit", normalizedEmail };
    }
  }

  await store.recordGrant({
    clerkUserId: input.clerkUserId,
    normalizedEmail,
    ...(deviceId ? { deviceId } : {}),
    ...(ipHash ? { ipHash } : {}),
  });

  return { credits: WELCOME_CREDITS, granted: true, normalizedEmail };
}
