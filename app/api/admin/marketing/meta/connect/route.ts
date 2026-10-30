import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isAdmin } from "@/lib/admin";
import { buildOAuthUrl, isMetaConfigured } from "@/lib/marketing/meta";
import { STATE_COOKIE } from "@/lib/marketing/oauth-state";

export const runtime = "nodejs";

// GET /api/admin/marketing/meta/connect
// Starts the Meta OAuth flow (guarded by the admin session, which the proxy
// matcher doesn't cover for /api/admin/*). Sends the user to the Facebook
// OAuth dialog with a CSRF state cookie that the callback verifies.
export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL("/admin/login", origin));
  }
  if (!isMetaConfigured()) {
    return NextResponse.redirect(
      new URL("/admin/marketing?meta=noconfig", origin)
    );
  }

  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildOAuthUrl(state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
