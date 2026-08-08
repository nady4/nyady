import { NextRequest, NextResponse } from "next/server";
import { signInAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
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
