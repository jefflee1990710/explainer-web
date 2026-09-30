import { NextResponse, type NextRequest } from "next/server";
import { usersCollection } from "@/dao";
import { findAffiliateByCode } from "@/service/affiliate/engine";
import { getAppUrl } from "@/util/app-url";
import { AFFILIATE_ENABLED, isAffiliateAccount } from "@/service/affiliate/enabled";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_DAYS,
} from "@/service/affiliate/rates";

// Public referral landing: set first-touch cookie, then send to sign-in.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const appUrl = getAppUrl();
  if (!AFFILIATE_ENABLED) {
    return NextResponse.redirect(`${appUrl}/`);
  }
  const affiliate = await findAffiliateByCode(code);
  const response = NextResponse.redirect(`${appUrl}/app`);

  if (affiliate) {
    const users = await usersCollection();
    const owner = await users.findOne({ clerkUserId: affiliate.clerkUserId });
    // A code only counts when that account is allowed to run Affiliate.
    if (isAffiliateAccount(owner)) {
      response.cookies.set(REFERRAL_COOKIE, affiliate.code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
      });
    }
  }

  return response;
}
