import { NextResponse } from "next/server";
import { markOrderReady } from "@/actions/orders";

// POST /api/orders/[id]/ship
// Seller-only endpoint: creates the Zipnova shipment for an approved order
// once elaboración is done, moving it from "En Preparación" to shipped/
// trackable. Gated by an admin token (ADMIN_TOKEN env var) rather than a
// user session, since the schema has no admin role and the store has a
// single seller. The buyer-facing /orders page only reads tracking, never
// triggers shipment creation.
//
// Usage: POST /api/orders/<id>/ship with header `x-admin-token: <ADMIN_TOKEN>`.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "Ship endpoint not configured (ADMIN_TOKEN missing)" },
      { status: 503 }
    );
  }

  const provided = _req.headers.get("x-admin-token");
  if (!provided || provided !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await markOrderReady(id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
