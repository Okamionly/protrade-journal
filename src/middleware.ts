import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/journal/:path*",
    "/analytics/:path*",
    "/screenshots/:path*",
    "/calendar/:path*",
    "/cot/:path*",
    "/macro/:path*",
    "/calendar-eco/:path*",
    "/performance/:path*",
    "/heatmap/:path*",
    "/daily-bias/:path*",
    "/sentiment/:path*",
    "/currency-strength/:path*",
    "/news/:path*",
    "/strategies/:path*",
    "/import/:path*",
    "/recaps/:path*",
    "/chat/:path*",
    "/api/trades/:path*",
    "/api/upload/:path*",
    "/api/user/:path*",
    "/api/chat/:path*",
    "/api/strategies/:path*",
    "/api/tags/:path*",
    "/api/monthly-goals/:path*",
    "/api/trading-rules/:path*",
  ],
};
