import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { encryptToken } from "@/lib/marketing/crypto";
import { completeMetaConnect, MetaError } from "@/lib/marketing/meta";
import { STATE_COOKIE } from "@/lib/marketing/oauth-state";

export const runtime = "nodejs";

// GET /api/admin/marketing/meta/callback
// Finishes the Meta OAuth flow: verifies the CSRF state cookie and the admin
// session, exchanges the code for a long-lived page token, stores the Page +
// IG accounts (tokens AES-encrypted) and sends the user back to the panel.
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = (code: string, message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin/marketing?meta=error&mkt_msg=${encodeURIComponent(message.slice(0, 800))}`,
        origin
      )
    );

  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL("/admin/login", origin));
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  const received = url.searchParams.get("state");
  if (!expected || !received || expected !== received) {
    return fail("state", "La conexión expiró o es inválida. Probá de nuevo.");
  }

  const errorParam = url.searchParams.get("error_description");
  if (errorParam || url.searchParams.get("error")) {
    return fail(
      "denied",
      errorParam ? `Meta rechazó la conexión: ${errorParam}` : "Meta rechazó la conexión."
    );
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return fail("nocode", "Meta no devolvió el código de conexión.");
  }

  try {
    const connected = await completeMetaConnect(code);

    const scopes = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
    ];
    await prisma.socialAccount.upsert({
      where: { channel: "facebook" },
      update: {
        pageId: connected.pageId,
        pageName: connected.pageName,
        igUserId: null,
        igUsername: null,
        tokenEnc: encryptToken(connected.pageToken),
        scopes,
      },
      create: {
        channel: "facebook",
        pageId: connected.pageId,
        pageName: connected.pageName,
        tokenEnc: encryptToken(connected.pageToken),
        scopes,
      },
    });

    if (connected.ig) {
      await prisma.socialAccount.upsert({
        where: { channel: "instagram" },
        update: {
          pageId: connected.pageId,
          igUserId: connected.ig.id,
          igUsername: connected.ig.username,
          tokenEnc: encryptToken(connected.pageToken),
          scopes,
        },
        create: {
          channel: "instagram",
          pageId: connected.pageId,
          igUserId: connected.ig.id,
          igUsername: connected.ig.username,
          tokenEnc: encryptToken(connected.pageToken),
          scopes,
        },
      });
    } else {
      // Page connected but the IG business account isn't linked: drop a stale
      // IG row so old tokens can't be used against the new Page token state.
      await prisma.socialAccount.deleteMany({ where: { channel: "instagram" } });
    }

    const target = connected.ig
      ? "/admin/marketing?meta=connected"
      : "/admin/marketing?meta=connected_no_ig";
    const response = NextResponse.redirect(new URL(target, origin));
    response.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    const message =
      error instanceof MetaError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Error conectando con Meta";
    console.error("[meta/callback]", error);
    return fail("exception", message);
  }
}
