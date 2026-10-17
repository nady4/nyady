import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// POST /api/admin/revalidate
// Forces Next.js to drop the route cache for the public storefront pages
// (/, /catalog, /products/*). Useful right after a bulk DB update that
// bypasses the admin server actions (e.g. seasonal availability toggle done
// via a SQL/Prisma script), so the next visitor immediately sees the
// updated product list instead of any stale cached HTML/JSON.
//
// Gated by the same ADMIN_TOKEN env var as the ship endpoint, since this
// is an ops-only hammer.
//
// Usage: POST /api/admin/revalidate with header `x-admin-token: <ADMIN_TOKEN>`
// Optional JSON body: { "paths": ["/", "/catalog"] } — defaults to the storefront
// public surfaces.
export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "Revalidate endpoint not configured (ADMIN_TOKEN missing)" },
      { status: 503 }
    );
  }

  const provided = req.headers.get("x-admin-token");
  if (!provided || provided !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const defaults = ["/", "/catalog", "/products"];
  let paths = defaults;
  try {
    const body = await req.json().catch(() => null);
    if (body && Array.isArray(body.paths) && body.paths.every((p: unknown) => typeof p === "string")) {
      paths = body.paths as string[];
    }
  } catch {
    // empty body is fine, use defaults
  }

  for (const p of paths) {
    revalidatePath(p);
  }

  return NextResponse.json({ ok: true, revalidated: paths });
}
