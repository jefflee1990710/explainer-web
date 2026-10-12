import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Scro's iframe adds ?embed=1. The root layout reads this to force the light theme.
export function middleware(request: NextRequest) {
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(
		"x-scro-embed",
		request.nextUrl.searchParams.get("embed") === "1" ? "1" : "0",
	);
	return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
	matcher: ["/editor/:path*"],
};
