import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
