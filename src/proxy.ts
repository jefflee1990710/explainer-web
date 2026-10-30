import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/service/firebase/session";
import { isLocaleId, REQUEST_LOCALE_HEADER } from "@/util/i18n/locales";

function nextWithLocale(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const hl = request.nextUrl.searchParams.get("hl");
  if (isLocaleId(hl)) requestHeaders.set(REQUEST_LOCALE_HEADER, hl);
  return NextResponse.next({ request: { headers: requestHeaders } });
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
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return nextWithLocale(request);
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
