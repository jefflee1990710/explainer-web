import { NextResponse, type NextRequest } from "next/server";
import { usersCollection } from "@/dao";
import { findAffiliateByCode } from "@/service/affiliate/engine";
import { AFFILIATE_ENABLED, isAffiliateAccount } from "@/service/affiliate/enabled";
import {
  affiliateRegistrationPath,
  referralCookieSettings,
} from "@/service/affiliate/link";
import { referralCodeOrNull } from "@/service/affiliate/referral-code";
import { REFERRAL_COOKIE } from "@/service/affiliate/rates";
import { SESSION_COOKIE } from "@/service/firebase/session";

// Public referral landing. Remember the code, then open registration on this same host.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!AFFILIATE_ENABLED) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // An existing session is not a new signup, so do not send them through registration.
  if (signedIn) {
    return NextResponse.redirect(new URL("/app/canvas", request.url));
  }

  const affiliate = await findAffiliateByCode(code);
  let activeCode: string | undefined;
  if (affiliate) {
    const users = await usersCollection();
    const owner = await users.findOne({ clerkUserId: affiliate.clerkUserId });
    // A code only counts when that account is allowed to run Affiliate.
    if (isAffiliateAccount(owner)) activeCode = referralCodeOrNull(affiliate.code);
  }

  // Stay on the request host. Redirecting to the canonical app URL drops a host-only cookie.
  const response = NextResponse.redirect(
    new URL(activeCode ? affiliateRegistrationPath(activeCode) : "/sign-up", request.url),
  );
  if (activeCode) {
    response.cookies.set(
      REFERRAL_COOKIE,
      activeCode,
      referralCookieSettings(request.nextUrl.protocol === "https:"),
    );
  }
  return response;
}
