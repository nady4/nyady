import { NextRequest, NextResponse } from "next/server";
import { signInAdmin } from "@/lib/admin";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = rateLimit({
    name: "admin-login",
    identity: clientIp(request),
    limit: 10,
    windowMs: 15 * 60_000
  });
  if (!rl.ok) return tooManyRequests(rl);

  let username = "";
  let password = "";

  try {
    const body = await request.json();
    username = String(body.username || "").trim();
    password = String(body.password || "");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Solicitud inválida" },
      { status: 400 }
    );
  }

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Completá usuario y contraseña" },
      { status: 400 }
    );
  }

  const result = await signInAdmin(username, password);

  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
