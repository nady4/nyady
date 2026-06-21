import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateCouponForUser } from "@/actions/coupons";

// POST /api/coupons/validate
// Validates a coupon code for the signed-in user WITHOUT consuming it.
// The usedCount increment happens at order creation in /api/orders, so an
// abandoned checkout doesn't burn a one-per-user coupon.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo de la petición inválido" },
      { status: 400 }
    );
  }

  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Ingresá un código de cupón" },
      { status: 400 }
    );
  }

  const result = await validateCouponForUser(code, session.user.id as string);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, coupon: result.coupon });
}
