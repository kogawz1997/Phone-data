import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const surface = process.env.NEXT_PUBLIC_APP_SURFACE || process.env.KOGA_APP_SURFACE || "admin";
  const { pathname } = request.nextUrl;

  if (surface === "owner" && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/platform";
    return NextResponse.redirect(url);
  }

  if (surface === "owner" && pathname.startsWith("/settings")) {
    const url = request.nextUrl.clone();
    url.pathname = "/platform";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/settings/:path*"],
};
