import { referralCodeOrNull } from "@/service/affiliate/referral-code";
import { REFERRAL_COOKIE_DAYS } from "@/service/affiliate/rates";

// Shared cookie flags. Callers pass secure from the request protocol.
export function referralCookieSettings(secure: boolean) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
  };
}

// Dashboard "Copy link" target. Opens registration with this affiliate's code.
export function affiliateRegistrationUrl(appUrl: string, code: string): string {
  const base = appUrl.replace(/\/$/, "");
  const normalized = referralCodeOrNull(code);
  if (!normalized) return `${base}/sign-up`;
  return `${base}/sign-up?ref=${normalized}`;
}

// Same path /r/[code] redirects to, so an older share hits the same registration entry.
export function affiliateRegistrationPath(code: string): string {
  const normalized = referralCodeOrNull(code);
  if (!normalized) return "/sign-up";
  return `/sign-up?ref=${normalized}`;
}
