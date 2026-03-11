export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/journal/:path*", "/analytics/:path*", "/screenshots/:path*", "/calendar/:path*", "/api/trades/:path*", "/api/upload/:path*", "/api/user/:path*"],
};
