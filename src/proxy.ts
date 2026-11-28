import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { referralCookieSettings } from "@/service/affiliate/link";
import { referralCodeOrNull } from "@/service/affiliate/referral-code";
import { REFERRAL_COOKIE } from "@/service/affiliate/rates";
import {
  SERVER_ACTION_ERROR_CONTENT_TYPE,
  serverActionAuthPlainBody,
} from "@/service/auth/server-action-auth";
import { SESSION_COOKIE } from "@/service/firebase/session";
import { isLocaleId, REQUEST_LOCALE_HEADER } from "@/util/i18n/locales";

function nextWithLocale(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const hl = request.nextUrl.searchParams.get("hl");
  if (isLocaleId(hl)) requestHeaders.set(REQUEST_LOCALE_HEADER, hl);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Store ?ref= for account creation when this browser has no referral cookie yet.
function withReferral(request: NextRequest, response: NextResponse) {
  const code = referralCodeOrNull(request.nextUrl.searchParams.get("ref"));
  if (!code || request.cookies.get(REFERRAL_COOKIE)?.value) return response;
  response.cookies.set(
    REFERRAL_COOKIE,
    code,
    referralCookieSettings(request.nextUrl.protocol === "https:"),
  );
  return response;
}

// Send unsigned visitors to sign-in. The session itself is verified in the app layout.
// Public pages also pass through so ?hl= can select the server-rendered language.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth =
    pathname.startsWith("/app") ||
    pathname.startsWith("/scroadmin") ||
    pathname === "/legal/accept";
  if (needsAuth && !request.cookies.get(SESSION_COOKIE)?.value) {
    const plain = serverActionAuthPlainBody(request.headers);
    if (plain) {
      // The HTML sign-in page is not an RSC payload, so Next.js would hide this 401.
      return new NextResponse(plain, {
        status: 401,
        headers: { "content-type": SERVER_ACTION_ERROR_CONTENT_TYPE },
      });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", pathname);
    const code = referralCodeOrNull(request.nextUrl.searchParams.get("ref"));
    if (code) url.searchParams.set("ref", code);
    return withReferral(request, NextResponse.redirect(url));
  }
  return withReferral(request, nextWithLocale(request));
}

export const config = {
  matcher: [
    "/",
    "/app/:path*",
    "/scroadmin",
    "/scroadmin/:path*",
    "/legal/accept",
    "/((?!_next/static|_next/image|api/|_freesound|monitoring|.*\\..*).*)",
  ],
};
