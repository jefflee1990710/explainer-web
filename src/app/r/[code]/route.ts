import { NextResponse, type NextRequest } from "next/server";
import { findAffiliateByCode } from "@/lib/affiliate/engine";
import { getAppUrl } from "@/lib/app-url";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_DAYS,
} from "@/lib/affiliate/rates";

// Public referral landing: set first-touch cookie, then send to sign-in.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const affiliate = await findAffiliateByCode(code);
  const appUrl = getAppUrl();
  const response = NextResponse.redirect(`${appUrl}/app`);

  if (affiliate) {
    response.cookies.set(REFERRAL_COOKIE, affiliate.code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
    });
  }

  return response;
}
